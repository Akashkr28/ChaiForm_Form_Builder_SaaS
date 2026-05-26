import { z, zodUndefinedModel } from "../../schema";
import { userService } from "../../services";
import { getAuthenticationMethodOutputSchema } from "@repo/services/user/model";
import db, { eq } from "@repo/database";
import { sessionsTable, usersTable } from "@repo/database/schema";
import { demoUser } from "@repo/forms";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { createSessionToken, hashPassword, verifyPassword } from "../../auth/password";
import { sendEmail } from "../../email";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

const sessionUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  onboardingCompleted: z.boolean(),
});

function makeVerificationToken() {
  return createSessionToken();
}

async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessionsTable).values({ id: token, userId, expiresAt });
  return token;
}

export const authRouter = router({
  getSupportedAuthenticationProviders: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/supported-providers"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.readonly(z.array(getAuthenticationMethodOutputSchema)))
    .query(async () => {
      const supportedMethods = await userService.getAuthenticationMethods();
      return supportedMethods;
    }),

  signup: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/signup"), tags: TAGS } })
    .input(
      z.object({
        fullName: z.string().min(2).max(80),
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .output(
      z.object({
        ok: z.boolean(),
        message: z.string(),
        verificationUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new Error("An account already exists for this email.");
      }

      const verificationToken = makeVerificationToken();
      const verificationUrl = `${WEB_URL}/auth/verify?token=${verificationToken}`;
      const [user] = await db
        .insert(usersTable)
        .values({
          fullName: input.fullName,
          email: input.email,
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          passwordHash: hashPassword(input.password),
        })
        .returning();

      if (!user) throw new Error("Could not create account.");

      await sendEmail({
        to: user.email,
        subject: "Verify your ChaiForms email",
        html: `<p>Welcome to ChaiForms.</p><p>Verify your email to continue: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
      });

      return {
        ok: true,
        message: "Check your inbox to verify your email.",
        verificationUrl: process.env.NODE_ENV === "production" ? undefined : verificationUrl,
      };
    }),

  verifyEmail: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/verify-email"), tags: TAGS } })
    .input(z.object({ token: z.string().min(12) }))
    .output(z.object({ token: z.string(), user: sessionUserSchema }))
    .mutation(async ({ input }) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, input.token)).limit(1);
      if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
        throw new Error("Verification link is invalid or expired.");
      }

      const [updated] = await db
        .update(usersTable)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      if (!updated) throw new Error("Could not verify email.");

      return {
        token: await createSession(updated.id),
        user: {
          id: updated.id,
          fullName: updated.fullName,
          email: updated.email,
          onboardingCompleted: updated.onboardingCompleted,
        },
      };
    }),

  login: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/login"), tags: TAGS } })
    .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
    .output(
      z.object({
        token: z.string(),
        user: sessionUserSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1);
      const isValidUser =
        user && verifyPassword(input.password, user.passwordHash);

      if (!isValidUser || !user) {
        throw new Error("Invalid email or password");
      }
      if (!user.emailVerified) {
        throw new Error("Please verify your email before signing in.");
      }

      return {
        token: await createSession(user.id),
        user: { id: user.id, fullName: user.fullName, email: user.email, onboardingCompleted: user.onboardingCompleted },
      };
    }),

  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          fullName: z.string(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          email: z.string(),
          contactNo: z.string().nullable().optional(),
          occupation: z.string().nullable().optional(),
          organizationName: z.string().nullable().optional(),
          onboardingCompleted: z.boolean(),
          subscriptionPlan: z.string(),
          subscriptionStatus: z.string(),
        }),
      }),
    )
    .query(async ({ ctx }) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ctx.user.id)).limit(1);
      if (!user) throw new Error("User not found.");
      return { user };
    }),

  updateProfile: protectedProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/profile"), tags: TAGS } })
    .input(
      z.object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().min(1).max(80),
        contactNo: z.string().min(7).max(32),
        occupation: z.enum(["Student", "Professional"]),
        organizationName: z.string().max(120).optional(),
      }),
    )
    .output(z.object({ user: sessionUserSchema }))
    .mutation(async ({ input, ctx }) => {
      const fullName = `${input.firstName} ${input.lastName}`.trim();
      const [user] = await db
        .update(usersTable)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          fullName,
          contactNo: input.contactNo,
          occupation: input.occupation,
          organizationName: input.organizationName || null,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, ctx.user.id))
        .returning();
      if (!user) throw new Error("Could not update profile.");
      return { user: { id: user.id, fullName: user.fullName, email: user.email, onboardingCompleted: user.onboardingCompleted } };
    }),

  deleteAccount: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/account"), tags: TAGS } })
    .input(z.object({ confirm: z.literal("DELETE") }))
    .output(z.object({ ok: z.boolean() }))
    .mutation(async ({ ctx }) => {
      await db.delete(usersTable).where(eq(usersTable.id, ctx.user.id));
      return { ok: true };
    }),

  demoLogin: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/demo-login"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        token: z.string(),
        user: z.object({ id: z.string(), fullName: z.string(), email: z.string() }),
      }),
    )
    .mutation(async () => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, demoUser.email)).limit(1);
      if (!user) throw new Error("Seed the database before using demo login.");
      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      await db.insert(sessionsTable).values({ id: token, userId: user.id, expiresAt });
      return { token, user: { id: user.id, fullName: user.fullName, email: user.email } };
    }),
});
