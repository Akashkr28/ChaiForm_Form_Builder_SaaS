import "dotenv/config";

import { db, eq } from "./index";
import { emailEventsTable, formResponsesTable, formsTable, sessionsTable, usersTable } from "./schema";
import { demoUser, sampleForms, sampleResponses } from "@repo/forms";
import { createHash } from "node:crypto";

const PEPPER = process.env.AUTH_SECRET ?? "dev-secret-change-me";

function hashPassword(password: string, salt = "demo-seed-salt") {
  const hash = createHash("sha256").update(`${salt}:${password}:${PEPPER}`).digest("hex");
  return `sha256:${salt}:${hash}`;
}

async function seed() {
  await db
    .insert(usersTable)
    .values({
      id: demoUser.id,
      fullName: demoUser.fullName,
      email: demoUser.email,
      emailVerified: true,
      passwordHash: hashPassword(demoUser.password),
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: {
        fullName: demoUser.fullName,
        emailVerified: true,
        passwordHash: hashPassword(demoUser.password),
      },
    });

  for (const form of sampleForms) {
    await db
      .insert(formsTable)
      .values({
        id: form.id,
        ownerId: form.ownerId,
        title: form.title,
        description: form.description,
        slug: form.slug,
        status: form.status,
        visibility: form.visibility,
        passwordHash: form.password ? hashPassword(form.password) : null,
        fields: form.fields,
        theme: form.theme,
        responseLimit: form.responseLimit,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        createdAt: new Date(form.createdAt),
      })
      .onConflictDoUpdate({
        target: formsTable.id,
        set: {
          title: form.title,
          description: form.description,
          slug: form.slug,
          status: form.status,
          visibility: form.visibility,
          passwordHash: form.password ? hashPassword(form.password) : null,
          fields: form.fields,
          theme: form.theme,
          responseLimit: form.responseLimit,
          expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        },
      });
  }

  for (const response of sampleResponses) {
    await db
      .insert(formResponsesTable)
      .values({
        id: response.id,
        formId: response.formId,
        respondentEmail: response.respondentEmail,
        values: response.values,
        ipHash: response.ipHash,
        submittedAt: new Date(response.submittedAt),
      })
      .onConflictDoNothing();
  }

  await db.delete(sessionsTable).where(eq(sessionsTable.userId, demoUser.id));
  await db.delete(emailEventsTable).where(eq(emailEventsTable.recipient, demoUser.email));
}

seed()
  .then(() => {
    console.log("Seeded ChaiForms demo data.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
