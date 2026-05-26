import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import db, { and, eq, gt } from "@repo/database";
import { sessionsTable, usersTable } from "@repo/database/schema";

export interface AppContext {
  user: {
    id: string;
    fullName: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    onboardingCompleted: boolean;
    subscriptionPlan: string;
    subscriptionStatus: string;
  } | null;
  ip?: string;
  userAgent?: string;
}

export async function createContext(opts?: CreateExpressContextOptions): Promise<AppContext> {
  const token = opts?.req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    const [session] = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        onboardingCompleted: usersTable.onboardingCompleted,
        subscriptionPlan: usersTable.subscriptionPlan,
        subscriptionStatus: usersTable.subscriptionStatus,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(and(eq(sessionsTable.id, token), gt(sessionsTable.expiresAt, new Date())))
      .limit(1);

    if (session) {
      return {
        user: session,
        ip: opts?.req.ip,
        userAgent: opts?.req.headers["user-agent"],
      };
    }
  }

  return {
    user: null,
    ip: opts?.req.ip,
    userAgent: opts?.req.headers["user-agent"],
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
