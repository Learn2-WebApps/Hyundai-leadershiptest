import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdmin, issueToken, verifyPassword } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관리자 세션 확인 */
export async function GET() {
  return NextResponse.json({ authenticated: isAdmin() });
}

/** 로그인 — 비밀번호는 서버 환경변수와만 대조한다. */
export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (!verifyPassword(body?.password)) {
    // 실패 사유를 구체적으로 알리지 않는다.
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = issueToken();
  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: token.maxAge,
  });
  return res;
}

/** 로그아웃 */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
