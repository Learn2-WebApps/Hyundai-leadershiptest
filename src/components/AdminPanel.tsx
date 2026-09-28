"use client";

import { useCallback, useEffect, useState } from "react";
import { CHARACTERS, type TypeCode } from "@/lib/characters";
import ResultView, { type ResultData } from "./ResultView";
import { Notice, Shell } from "./ui";

type SessionRow = {
  sessionCode: string;
  status: "open" | "closed";
  createdAt: string;
  closedAt: string | null;
  participantCount: number;
};

type ParticipantRow = {
  id: string;
  participantName: string;
  predictedType: TypeCode | null;
  finalCharacterType: TypeCode | null;
  hasTopTie: boolean | null;
  predictionMatched: boolean | null;
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed";
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })
    : "-";

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [detail, setDetail] = useState<ResultData | null>(null);
  const [pending, setPending] = useState<string | null>(null); // 처리 중인 세션 코드
  const [sessionsLoaded, setSessionsLoaded] = useState(false); // 목록을 한 번이라도 받아왔는지
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  /**
   * 세션 목록 요청 하나로 인증 여부까지 판단한다.
   * (로그인 확인 → 목록 조회로 이어지던 순차 왕복을 한 번으로 줄인다.)
   */
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sessions");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const json = await res.json();
      setSessions(json.sessions ?? []);
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setSessionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadParticipants = useCallback(async (code: string) => {
    setSelected(code);
    setDetail(null);
    setParticipants([]);
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/admin/sessions/${code}/participants`);
      if (!res.ok) return;
      const json = await res.json();
      setParticipants(json.participants ?? []);
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("비밀번호가 올바르지 않습니다.");
      setPassword("");
      setAuthed(true);
      setSessionsLoaded(false);
      loadSessions();
    } catch (e: any) {
      setError(e?.message ?? "로그인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setSessions([]);
    setSelected(null);
    setParticipants([]);
    setDetail(null);
  };

  // 서버 응답으로 목록을 바로 갱신한다. 목록 전체를 다시 조회하지 않아 반응이 즉시 보인다.
  const createSession = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sessions", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "세션을 만들지 못했습니다.");
      setSessions((prev) => [json.session, ...prev]);
    } catch (e: any) {
      setError(e?.message ?? "세션을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const closeSession = async (code: string) => {
    if (!confirm(`세션 ${code} 을(를) 종료할까요? 종료하면 새로운 참여가 차단됩니다.`)) return;
    setPending(code);
    setError(null);
    // 먼저 화면을 바꾸고, 실패하면 되돌린다.
    const before = sessions;
    setSessions((prev) =>
      prev.map((s) => (s.sessionCode === code ? { ...s, status: "closed", closedAt: new Date().toISOString() } : s))
    );
    try {
      const res = await fetch(`/api/admin/sessions/${code}`, { method: "PATCH" });
      if (!res.ok) throw new Error("세션을 종료하지 못했습니다.");
    } catch (e: any) {
      setSessions(before);
      setError(e?.message ?? "세션을 종료하지 못했습니다.");
    } finally {
      setPending(null);
    }
  };

  const deleteSession = async (code: string, count: number) => {
    const warn =
      count > 0
        ? `세션 ${code} 을(를) 삭제하면 참여자 ${count}명의 진단 결과도 함께 삭제됩니다. 되돌릴 수 없습니다. 삭제할까요?`
        : `세션 ${code} 을(를) 삭제할까요? 되돌릴 수 없습니다.`;
    if (!confirm(warn)) return;
    setPending(code);
    setError(null);
    const before = sessions;
    setSessions((prev) => prev.filter((s) => s.sessionCode !== code));
    if (selected === code) {
      setSelected(null);
      setParticipants([]);
      setDetail(null);
    }
    try {
      const res = await fetch(`/api/admin/sessions/${code}`, { method: "DELETE" });
      if (!res.ok) throw new Error("세션을 삭제하지 못했습니다.");
    } catch (e: any) {
      setSessions(before);
      setError(e?.message ?? "세션을 삭제하지 못했습니다.");
    } finally {
      setPending(null);
    }
  };

  if (authed === null)
    return (
      <Shell>
        <p className="text-center text-inkFaint">확인 중…</p>
      </Shell>
    );

  if (!authed)
    return (
      <Shell>
        <div className="card space-y-4 p-7">
          <h2 className="text-[20px] font-extrabold">관리자 모드</h2>
          <input
            type="password"
            className="field tracking-[0.3em]"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          {error ? <Notice tone="warn">{error}</Notice> : null}
          <button className="btn-primary w-full" onClick={login} disabled={busy || !password}>
            로그인
          </button>
          <button className="btn-ghost w-full" onClick={onExit}>
            진단 화면으로 돌아가기
          </button>
        </div>
      </Shell>
    );

  if (detail)
    return (
      <Shell>
        <button className="btn-ghost mb-5" onClick={() => setDetail(null)}>
          ← 참여자 목록
        </button>
        <ResultView data={detail} />
      </Shell>
    );

  return (
    <Shell wide>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[22px] font-extrabold">세션 관리</h2>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onExit}>
            진단 화면
          </button>
          <button className="btn-ghost" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>

      <div className="card mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold">세션 목록</h3>
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={createSession} disabled={busy}>
            {busy ? "만드는 중…" : "새 세션 만들기"}
          </button>
        </div>
        {error ? <div className="mb-4"><Notice tone="warn">{error}</Notice></div> : null}
        {!sessionsLoaded ? (
          <Notice>세션 목록을 불러오는 중입니다…</Notice>
        ) : sessions.length === 0 ? (
          <Notice>아직 생성된 세션이 없습니다.</Notice>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-inkFaint">
                <tr className="border-b border-line">
                  <th className="py-2">세션 코드</th>
                  <th>상태</th>
                  <th>생성</th>
                  <th>종료</th>
                  <th>참여자</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.sessionCode} className="border-b border-line/70">
                    <td className="py-3 text-[16px] font-extrabold tracking-[0.15em]">{s.sessionCode}</td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          s.status === "open" ? "bg-accentSoft text-accentDeep" : "bg-[#EDE5DC] text-inkFaint"
                        }`}
                      >
                        {s.status === "open" ? "참여 가능" : "종료됨"}
                      </span>
                    </td>
                    <td className="text-inkSoft">{fmt(s.createdAt)}</td>
                    <td className="text-inkSoft">{fmt(s.closedAt)}</td>
                    <td className="font-semibold">{s.participantCount}명</td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-2">
                        {pending === s.sessionCode ? (
                          <span className="text-xs font-semibold text-inkFaint">처리 중…</span>
                        ) : null}
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => loadParticipants(s.sessionCode)}
                          disabled={pending === s.sessionCode}
                        >
                          참여자
                        </button>
                        {s.status === "open" ? (
                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() => closeSession(s.sessionCode)}
                            disabled={pending === s.sessionCode}
                          >
                            종료
                          </button>
                        ) : null}
                        <button
                          className="rounded-full border border-[#E3BFB3] bg-white px-3 py-1.5 text-xs font-medium text-[#A65B48] disabled:opacity-50"
                          onClick={() => deleteSession(s.sessionCode, s.participantCount)}
                          disabled={pending === s.sessionCode}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <div className="card p-6">
          <h3 className="mb-4 text-[17px] font-extrabold">세션 {selected} 참여자</h3>
          {loadingParticipants ? (
            <Notice>참여자 정보를 불러오는 중입니다…</Notice>
          ) : participants.length === 0 ? (
            <Notice>아직 참여자가 없습니다.</Notice>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-inkFaint">
                  <tr className="border-b border-line">
                    <th className="py-2">이름</th>
                    <th>시작</th>
                    <th>완료</th>
                    <th>예상 유형</th>
                    <th>대표 유형</th>
                    <th>동점</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id} className="border-b border-line/70">
                      <td className="py-3 font-bold">{p.participantName}</td>
                      <td className="text-inkSoft">{fmt(p.startedAt)}</td>
                      <td className="text-inkSoft">
                        {p.status === "completed" ? fmt(p.completedAt) : <span className="text-inkFaint">진행 중</span>}
                      </td>
                      <td>{p.predictedType ? CHARACTERS[p.predictedType].name : "-"}</td>
                      <td className="font-semibold">
                        {p.finalCharacterType ? CHARACTERS[p.finalCharacterType].name : "-"}
                      </td>
                      <td>{p.hasTopTie ? "있음" : "-"}</td>
                      <td className="py-2 text-right">
                        {p.finalCharacterType ? (
                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() =>
                              setDetail({
                                participantName: p.participantName,
                                predictedType: p.predictedType,
                                finalCharacterType: p.finalCharacterType as TypeCode,
                                predictionMatched: p.predictionMatched,
                                hasTopTie: !!p.hasTopTie,
                                tiedTypes: null,
                              })
                            }
                          >
                            상세보기
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </Shell>
  );
}
