import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 콜드 스타트 완화용. 화면이 열리는 순간 호출해 함수 기동과 Firestore 연결을 미리 끝내둔다.
 * 어떤 데이터도 반환하지 않으며, 존재하지 않는 코드를 한 번 조회할 뿐이다.
 */
export async function GET() {
  try {
    await getStore().getSession("____warmup");
  } catch {
    // 워밍업 실패는 무시한다.
  }
  return NextResponse.json({ ok: true });
}
