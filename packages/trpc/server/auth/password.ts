import { createHash, randomBytes } from "node:crypto";

const PEPPER = process.env.AUTH_SECRET ?? "dev-secret-change-me";

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = createHash("sha256").update(`${salt}:${password}:${PEPPER}`).digest("hex");
  return `sha256:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;
  const [, salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  return hashPassword(password, salt) === storedHash;
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}
