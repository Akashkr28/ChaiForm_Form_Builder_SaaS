import { and, count, desc, eq, ilike } from "@repo/database";
import db from "@repo/database";
import { emailEventsTable, formResponsesTable, formsTable, rateLimitsTable, usersTable } from "@repo/database/schema";
import { buildResponseValidator, demoUser, summarizeForm, type FormRecord, type FormResponse } from "@repo/forms";
import { hashPassword, verifyPassword } from "../../auth/password";
import { sendEmail } from "../../email";

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function toFormRecord(row: typeof formsTable.$inferSelect): FormRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    slug: row.slug,
    status: row.status,
    visibility: row.visibility,
    fields: row.fields,
    theme: row.theme,
    responseLimit: row.responseLimit ?? undefined,
    expiresAt: row.expiresAt?.toISOString(),
    createdAt: row.createdAt?.toISOString() ?? now(),
    updatedAt: row.updatedAt?.toISOString() ?? row.createdAt?.toISOString() ?? now(),
  };
}

function toResponseRecord(row: typeof formResponsesTable.$inferSelect): FormResponse {
  return {
    id: row.id,
    formId: row.formId,
    respondentEmail: row.respondentEmail ?? undefined,
    values: row.values,
    submittedAt: row.submittedAt?.toISOString() ?? now(),
    ipHash: row.ipHash ?? undefined,
  };
}

export async function listExploreForms() {
  const rows = await db
    .select()
    .from(formsTable)
    .where(and(eq(formsTable.status, "published"), eq(formsTable.visibility, "public")))
    .orderBy(desc(formsTable.createdAt));
  return rows.map(toFormRecord);
}

export async function listCreatorForms(ownerId = demoUser.id) {
  const rows = await db.select().from(formsTable).where(eq(formsTable.ownerId, ownerId)).orderBy(desc(formsTable.createdAt));
  return rows.map(toFormRecord);
}

export async function getFormBySlug(slug: string) {
  const [row] = await db.select().from(formsTable).where(eq(formsTable.slug, slug)).limit(1);
  return row ? toFormRecord(row) : undefined;
}

async function getFormRow(idOrSlug: string) {
  const [byId] = await db.select().from(formsTable).where(eq(formsTable.id, idOrSlug)).limit(1);
  if (byId) return byId;
  const [bySlug] = await db.select().from(formsTable).where(eq(formsTable.slug, idOrSlug)).limit(1);
  return bySlug;
}

export async function getForm(idOrSlug: string) {
  const row = await getFormRow(idOrSlug);
  return row ? toFormRecord(row) : undefined;
}

export async function upsertForm(input: Omit<FormRecord, "id" | "ownerId" | "createdAt" | "updatedAt"> & { id?: string; ownerId?: string }) {
  const formId = input.id ?? id("form");
  const createdAt = new Date();
  const values = {
    id: formId,
    ownerId: input.ownerId ?? demoUser.id,
    title: input.title,
    description: input.description,
    slug: input.slug,
    status: input.status,
    visibility: input.visibility,
    passwordHash: input.password ? hashPassword(input.password) : null,
    fields: input.fields,
    theme: input.theme,
    responseLimit: input.responseLimit,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdAt,
    updatedAt: createdAt,
  };

  const [row] = await db
    .insert(formsTable)
    .values(values)
    .onConflictDoUpdate({
      target: formsTable.id,
      set: {
        title: values.title,
        description: values.description,
        slug: values.slug,
        status: values.status,
        visibility: values.visibility,
        passwordHash: values.passwordHash,
        fields: values.fields,
        theme: values.theme,
        responseLimit: values.responseLimit,
        expiresAt: values.expiresAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return toFormRecord(row!);
}

export async function updateFormStatus(idOrSlug: string, status: FormRecord["status"]) {
  const form = await getForm(idOrSlug);
  if (!form) return null;
  const [row] = await db
    .update(formsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(formsTable.id, form.id))
    .returning();
  return row ? toFormRecord(row) : null;
}

export async function cloneForm(idOrSlug: string) {
  const source = await getForm(idOrSlug);
  if (!source) return null;
  return upsertForm({
    ...source,
    id: undefined,
    title: `${source.title} Copy`,
    slug: `${source.slug}-copy-${Math.random().toString(36).slice(2, 5)}`,
    status: "draft",
  });
}

export async function getResponses(formId: string) {
  const rows = await db
    .select()
    .from(formResponsesTable)
    .where(eq(formResponsesTable.formId, formId))
    .orderBy(desc(formResponsesTable.submittedAt));
  return rows.map(toResponseRecord);
}

export async function getResponsesPage(input: { formId: string; page?: number; pageSize?: number; query?: string }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, input.pageSize ?? 10));
  const where = input.query
    ? and(eq(formResponsesTable.formId, input.formId), ilike(formResponsesTable.respondentEmail, `%${input.query}%`))
    : eq(formResponsesTable.formId, input.formId);

  const [{ total = 0 } = { total: 0 }] = await db.select({ total: count() }).from(formResponsesTable).where(where);
  const rows = await db
    .select()
    .from(formResponsesTable)
    .where(where)
    .orderBy(desc(formResponsesTable.submittedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: rows.map(toResponseRecord),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAnalytics(form: FormRecord) {
  const responses = await getResponses(form.id);
  const base = summarizeForm(form, responses);
  const fieldBreakdown = form.fields.map((field) => {
    const answers = responses.map((response) => response.values[field.id]).filter(Boolean);
    return {
      fieldId: field.id,
      label: field.label,
      answers: answers.length,
      topValues: Object.entries(
        answers.flatMap((answer) => (Array.isArray(answer) ? answer : [answer])).reduce<Record<string, number>>((acc, answer) => {
          const key = String(answer);
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
      ).slice(0, 5),
    };
  });
  const responseTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      responses: responses.filter((response) => response.submittedAt.slice(0, 10) === key).length,
    };
  });

  return {
    ...base,
    starts: base.views,
    dropOffs: Math.max(0, base.views - base.responses),
    fieldBreakdown,
    responseTrend,
  };
}

export async function assertSubmissionAllowed(form: FormRecord | undefined, password?: string) {
  if (!form) return { ok: false as const, code: "NOT_FOUND", message: "This form link does not exist." };
  if (form.status !== "published") return { ok: false as const, code: "UNAVAILABLE", message: "This form is not accepting responses right now." };
  if (form.expiresAt && new Date(form.expiresAt) < new Date()) return { ok: false as const, code: "EXPIRED", message: "This form has expired." };
  if (form.responseLimit && (await getResponses(form.id)).length >= form.responseLimit) return { ok: false as const, code: "FULL", message: "This form has reached its response limit." };

  const row = await getFormRow(form.id);
  if (row?.passwordHash && !verifyPassword(password ?? "", row.passwordHash)) {
    return { ok: false as const, code: "PASSWORD_REQUIRED", message: "Enter the form password to continue." };
  }

  return { ok: true as const };
}

export async function submitResponse(input: { slug: string; password?: string; respondentEmail?: string; values: Record<string, unknown>; ip?: string; userAgent?: string }) {
  const form = await getFormBySlug(input.slug);
  const allowed = await assertSubmissionAllowed(form, input.password);
  if (!allowed.ok) return allowed;
  const liveForm = form!;

  const key = `${input.ip ?? "local"}:${input.slug}`;
  const currentTime = new Date();
  const resetAt = new Date(Date.now() + 60_000);
  const [currentLimit] = await db.select().from(rateLimitsTable).where(eq(rateLimitsTable.key, key)).limit(1);
  const activeWindow = currentLimit && currentLimit.resetAt > currentTime;
  if (activeWindow && currentLimit.count >= 8) {
    return { ok: false as const, code: "RATE_LIMITED", message: "Too many submissions from this network. Please try again soon." };
  }
  await db
    .insert(rateLimitsTable)
    .values({ key, count: 1, resetAt, updatedAt: currentTime })
    .onConflictDoUpdate({
      target: rateLimitsTable.key,
      set: {
        count: activeWindow ? currentLimit.count + 1 : 1,
        resetAt: activeWindow ? currentLimit.resetAt : resetAt,
        updatedAt: currentTime,
      },
    });

  const validator = buildResponseValidator(liveForm.fields);
  const parsed = validator.safeParse(input.values);
  if (!parsed.success) {
    return { ok: false as const, code: "VALIDATION_ERROR", message: parsed.error.issues.at(0)?.message ?? "Please check your answers." };
  }

  const [responseRow] = await db
    .insert(formResponsesTable)
    .values({
      id: id("response"),
      formId: liveForm.id,
      respondentEmail: input.respondentEmail,
      values: parsed.data,
      submittedAt: new Date(),
      ipHash: input.ip ? Buffer.from(input.ip).toString("base64").slice(0, 24) : undefined,
      userAgent: input.userAgent,
    })
    .returning();
  const response = toResponseRecord(responseRow!);

  const [owner] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, liveForm.ownerId)).limit(1);
  const queuedEvents = [
    {
      id: id("email"),
      formId: liveForm.id,
      responseId: response.id,
      recipient: owner?.email ?? demoUser.email,
      type: "creator_new_response",
      status: "queued",
    },
    ...(input.respondentEmail
      ? [
          {
            id: id("email"),
            formId: liveForm.id,
            responseId: response.id,
            recipient: input.respondentEmail,
            type: "respondent_thank_you",
            status: "queued",
          },
        ]
      : []),
  ];

  const emailEvents = await db.insert(emailEventsTable).values(queuedEvents).returning();

  for (const event of emailEvents) {
    const delivery = await sendEmail({
      to: event.recipient,
      subject: event.type === "creator_new_response" ? `New response for ${liveForm.title}` : `Thanks for responding to ${liveForm.title}`,
      html:
        event.type === "creator_new_response"
          ? `<p>Your form <strong>${liveForm.title}</strong> received a new response.</p>`
          : `<p>Thanks for submitting <strong>${liveForm.title}</strong>. Your response was received.</p>`,
    });
    await db.update(emailEventsTable).set({ status: delivery.status }).where(eq(emailEventsTable.id, event.id));
    event.status = delivery.status;
  }

  return {
    ok: true as const,
    response,
    emailEvents: emailEvents.map((event) => ({
      id: event.id,
      formId: event.formId ?? liveForm.id,
      responseId: event.responseId ?? response.id,
      recipient: event.recipient,
      type: event.type,
      status: event.status,
      createdAt: event.createdAt?.toISOString() ?? now(),
    })),
  };
}

export async function listEmailEvents() {
  const rows = await db.select().from(emailEventsTable).orderBy(desc(emailEventsTable.createdAt));
  return rows.map((event) => ({
    id: event.id,
    formId: event.formId ?? "",
    responseId: event.responseId ?? "",
    recipient: event.recipient,
    type: event.type,
    status: event.status,
    createdAt: event.createdAt?.toISOString() ?? now(),
  }));
}
