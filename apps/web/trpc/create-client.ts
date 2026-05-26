import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return c({
    url: env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc",
    fetch(url, options) {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("chaiforms_session_token") : undefined;
      return fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          ...options?.headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
    },
  });
};
