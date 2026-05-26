import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";
import { completeGoogleLogin, getGoogleAuthUrl, isGoogleOAuthConfigured } from "./auth-google";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "ChaiForms OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
      allowedHeaders: ["content-type", "authorization", "x-demo-user"],
    }),
  );
}

app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ message: "ChaiForms is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "ChaiForms server is healthy", healthy: true });
});

app.get("/auth/google", (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(`${env.WEB_URL}/auth?error=google_not_configured`);
  }

  return res.redirect(getGoogleAuthUrl());
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    if (!code) throw new Error("Missing Google OAuth code.");
    const session = await completeGoogleLogin(code);
    const params = new URLSearchParams({
      token: session.token,
      email: session.user.email,
      name: session.user.fullName,
      onboarding: session.user.onboardingCompleted ? "complete" : "required",
    });
    return res.redirect(`${env.WEB_URL}/auth/callback?${params.toString()}`);
  } catch (error) {
    logger.error("Google OAuth callback failed", { error });
    return res.redirect(`${env.WEB_URL}/auth?error=google_failed`);
  }
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
