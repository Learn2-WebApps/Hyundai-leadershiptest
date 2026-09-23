import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const participants = await getStore().listParticipants(params.code);
  return NextResponse.json({ participants });
}
