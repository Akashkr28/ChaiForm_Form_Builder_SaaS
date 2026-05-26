import { z, zodUndefinedModel } from "../../schema";
import {
  createFormInputSchema,
  formSchema,
  responseSchema,
  submitResponseInputSchema,
  demoUser,
} from "@repo/forms";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  cloneForm,
  deleteForm,
  getAnalytics,
  getForm,
  getFormBySlug,
  getResponses,
  getResponsesPage,
  listCreatorForms,
  listEmailEvents,
  listExploreForms,
  submitResponse,
  updateFormStatus,
  upsertForm,
} from "./store";

const TAGS = ["Forms"];
const getPath = generatePath("/forms");

const analyticsSchema = z.object({
  formId: z.string(),
  views: z.number(),
  starts: z.number(),
  responses: z.number(),
  completionRate: z.number(),
  dropOffs: z.number(),
  lastSubmissionAt: z.string().optional(),
  fieldBreakdown: z.array(
    z.object({
      fieldId: z.string(),
      label: z.string(),
      answers: z.number(),
      topValues: z.array(z.tuple([z.string(), z.number()])),
    }),
  ),
  responseTrend: z.array(z.object({ date: z.string(), responses: z.number() })),
});

const paginatedResponsesSchema = z.object({
  items: z.array(responseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  pageCount: z.number(),
});

export const formsRouter = router({
  listExplore: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/explore"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.array(formSchema))
    .query(() => listExploreForms()),

  getPublicBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{slug}"), tags: TAGS } })
    .input(z.object({ slug: z.string() }))
    .output(z.object({ form: formSchema.optional(), unavailableReason: z.string().optional() }))
    .query(async ({ input }) => {
      const form = await getFormBySlug(input.slug);
      if (!form) return { unavailableReason: "This form link does not exist." };
      if (form.status !== "published") return { form, unavailableReason: "This form is not accepting responses right now." };
      if (form.expiresAt && new Date(form.expiresAt) < new Date()) return { form, unavailableReason: "This form has expired." };
      return { form };
    }),

  submitResponse: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{slug}/responses"), tags: TAGS } })
    .input(submitResponseInputSchema)
    .output(
      z.object({
        ok: z.boolean(),
        code: z.string().optional(),
        message: z.string().optional(),
        response: responseSchema.optional(),
        emailEvents: z
          .array(z.object({ id: z.string(), formId: z.string(), responseId: z.string(), recipient: z.string(), type: z.string(), status: z.string(), createdAt: z.string() }))
          .optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      submitResponse({
        ...input,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      }),
    ),

  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: ["Creator"] } })
    .input(zodUndefinedModel)
    .output(z.object({ user: z.object({ id: z.string(), fullName: z.string(), email: z.string() }) }))
    .query(({ ctx }) => ({ user: ctx.user })),

  listMine: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/creator"), tags: ["Creator"] } })
    .input(zodUndefinedModel)
    .output(z.array(formSchema))
    .query(({ ctx }) => listCreatorForms(ctx.user.id)),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/creator"), tags: ["Creator"] } })
    .input(createFormInputSchema)
    .output(formSchema)
    .mutation(({ input, ctx }) => upsertForm({ ...input, ownerId: ctx.user.id })),

  update: protectedProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/creator/{id}"), tags: ["Creator"] } })
    .input(createFormInputSchema.extend({ id: z.string() }))
    .output(formSchema)
    .mutation(({ input, ctx }) => upsertForm({ ...input, ownerId: ctx.user.id })),

  setStatus: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/creator/{id}/status"), tags: ["Creator"] } })
    .input(z.object({ id: z.string(), status: z.enum(["draft", "published", "archived"]) }))
    .output(formSchema.nullable())
    .mutation(({ input }) => updateFormStatus(input.id, input.status)),

  clone: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/creator/{id}/clone"), tags: ["Creator"] } })
    .input(z.object({ id: z.string() }))
    .output(formSchema.nullable())
    .mutation(({ input }) => cloneForm(input.id)),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/creator/{id}"), tags: ["Creator"] } })
    .input(z.object({ id: z.string() }))
    .output(z.object({ ok: z.boolean() }))
    .mutation(({ input, ctx }) => deleteForm(input.id, ctx.user.id)),

  responses: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/creator/{id}/responses"), tags: ["Creator"] } })
    .input(z.object({ id: z.string() }))
    .output(z.array(responseSchema))
    .query(async ({ input }) => {
      const form = await getForm(input.id);
      return form ? getResponses(form.id) : [];
    }),

  responsesPage: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/creator/{id}/responses-page"), tags: ["Creator"] } })
    .input(z.object({ id: z.string(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(50).default(10), query: z.string().optional() }))
    .output(paginatedResponsesSchema)
    .query(async ({ input }) => {
      const form = await getForm(input.id);
      if (!form) return { items: [], total: 0, page: input.page, pageSize: input.pageSize, pageCount: 1 };
      return getResponsesPage({ formId: form.id, page: input.page, pageSize: input.pageSize, query: input.query });
    }),

  analytics: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/creator/{id}/analytics"), tags: ["Creator"] } })
    .input(z.object({ id: z.string() }))
    .output(analyticsSchema.nullable())
    .query(async ({ input }) => {
      const form = await getForm(input.id);
      return form ? getAnalytics(form) : null;
    }),

  emailEvents: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/creator/email-events"), tags: ["Emails"] } })
    .input(zodUndefinedModel)
    .output(z.array(z.object({ id: z.string(), formId: z.string(), responseId: z.string(), recipient: z.string(), type: z.string(), status: z.string(), createdAt: z.string() })))
    .query(() => listEmailEvents()),
});
