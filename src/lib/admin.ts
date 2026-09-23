import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "flt_admin";
const MAX_AGE = 60 * 60 * 8;

const secret = () => process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret";
const sign = (payload: string) => crypto.createHmac("sha256", secret()).update(payload).digest("hex");

/**
 * 관리자 비밀번호는 환경변수에서만 읽는다. 소스에 기본값을 두지 않으며,
 * NEXT_PUBLIC_ 접두사가 아니므로 클라이언트 번들에도 포함되지 않는다.
 */
export function verifyPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // 환경변수가 없으면 어떤 비밀번호도 통과시키지 않는다.
  const a = Buffer.from(String(input ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function issueToken(): { value: string; maxAge: number } {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = "admin." + exp;
  return { value: payload + "." + sign(payload), maxAge: MAX_AGE };
}

export function isAdmin(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [role, expRaw, sig] = token.split(".");
  if (role !== "admin" || !expRaw || !sig) return false;
  const expected = sign(role + "." + expRaw);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(expRaw) > Date.now();
}
