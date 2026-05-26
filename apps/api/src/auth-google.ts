import db, { eq } from "@repo/database";
import { sessionsTable, usersTable } from "@repo/database/schema";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "node:crypto";
import { env } from "./env";

export function isGoogleOAuthConfigured() {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI);
}

export function createGoogleClient() {
  return new OAuth2Client({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
  });
}

export function getGoogleAuthUrl() {
  return createGoogleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
  });
}

export async function completeGoogleLogin(code: string) {
  const client = createGoogleClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token ?? "",
    audience: env.GOOGLE_OAUTH_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new Error("Google did not return a verified email profile.");
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, payload.email)).limit(1);
  const user =
    existing ??
    (
      await db
        .insert(usersTable)
        .values({
          fullName: payload.name ?? payload.email.split("@")[0] ?? "Creator",
          firstName: payload.given_name,
          lastName: payload.family_name,
          email: payload.email,
          emailVerified: Boolean(payload.email_verified),
          profileImageUrl: payload.picture,
          authProvider: "google",
          authProviderId: payload.sub,
        })
        .returning()
    )[0];

  if (!user) throw new Error("Could not create Google user.");

  if (existing && (!existing.authProviderId || !existing.profileImageUrl)) {
    await db
      .update(usersTable)
      .set({
        authProvider: existing.authProvider === "credentials" ? "credentials" : "google",
        authProviderId: existing.authProviderId ?? payload.sub,
        profileImageUrl: existing.profileImageUrl ?? payload.picture,
        firstName: existing.firstName ?? payload.given_name,
        lastName: existing.lastName ?? payload.family_name,
        emailVerified: existing.emailVerified || Boolean(payload.email_verified),
      })
      .where(eq(usersTable.id, existing.id));
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessionsTable).values({ id: token, userId: user.id, expiresAt });
  return { token, user };
}
