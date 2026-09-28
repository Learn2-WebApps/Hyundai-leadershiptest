import type { TypeCode } from "./characters";
import type { Answer, Scores } from "./scoring";

export type SessionStatus = "open" | "closed";

export type SessionRecord = {
  sessionCode: string; // 반드시 문자열. "0047" 의 앞자리 0 을 유지한다.
  status: SessionStatus;
  createdAt: string;
  closedAt: string | null;
  participantCount: number;
};

export type ParticipantRecord = {
  id: string;
  sessionCode: string;
  participantName: string;
  predictedType: TypeCode | null;
  predictedCharacterName: string | null;
  predictionSelectedAt: string | null;
  predictionDisplayOrder: TypeCode[] | null;
  answers: Answer[] | null;
  scores: Scores | null;
  hasTopTie: boolean | null;
  tiedTypes: TypeCode[] | null;
  tieBreakSelectedType: TypeCode | null;
  finalCharacterType: TypeCode | null;
  finalCharacterName: string | null;
  predictionMatched: boolean | null;
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed";
};

export interface Store {
  readonly kind: "firestore" | "memory";
  /** 코드가 이미 있으면 null 을 반환한다. 사전 조회 없이 한 번의 왕복으로 처리하기 위함. */
  createSession(code: string): Promise<SessionRecord | null>;
  getSession(code: string): Promise<SessionRecord | null>;
  listSessions(): Promise<SessionRecord[]>;
  closeSession(code: string): Promise<boolean>;
  /** 세션과 해당 세션의 참여자 데이터를 함께 삭제한다. 부분 삭제가 남지 않게 한다. */
  deleteSessionCascade(code: string): Promise<number>;
  createParticipant(p: Omit<ParticipantRecord, "id">): Promise<ParticipantRecord>;
  updateParticipant(id: string, patch: Partial<ParticipantRecord>): Promise<ParticipantRecord | null>;
  getParticipant(id: string): Promise<ParticipantRecord | null>;
  listParticipants(code: string): Promise<ParticipantRecord[]>;
}

/* ---------------- 메모리 폴백 (Firebase 키가 없을 때) ---------------- */
type Mem = { sessions: Map<string, SessionRecord>; participants: Map<string, ParticipantRecord>; seq: number };
const g = globalThis as unknown as { __fltMem?: Mem };
if (!g.__fltMem) g.__fltMem = { sessions: new Map(), participants: new Map(), seq: 0 };
const mem: Mem = g.__fltMem;

const memoryStore: Store = {
  kind: "memory",
  async createSession(code) {
    if (mem.sessions.has(code)) return null;
    const s: SessionRecord = {
      sessionCode: code,
      status: "open",
      createdAt: new Date().toISOString(),
      closedAt: null,
      participantCount: 0,
    };
    mem.sessions.set(code, s);
    return s;
  },
  async getSession(code) {
    return mem.sessions.get(code) ?? null;
  },
  async listSessions() {
    return [...mem.sessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async closeSession(code) {
    const s = mem.sessions.get(code);
    if (!s) return false;
    s.status = "closed";
    s.closedAt = new Date().toISOString();
    return true;
  },
  async deleteSessionCascade(code) {
    let n = 0;
    for (const [id, p] of mem.participants) {
      if (p.sessionCode === code) {
        mem.participants.delete(id);
        n++;
      }
    }
    mem.sessions.delete(code);
    return n;
  },
  async createParticipant(p) {
    mem.seq += 1;
    const id = "p" + mem.seq + "_" + Date.now().toString(36);
    const rec: ParticipantRecord = { ...p, id };
    mem.participants.set(id, rec);
    const s = mem.sessions.get(p.sessionCode);
    if (s) s.participantCount += 1;
    return rec;
  },
  async updateParticipant(id, patch) {
    const cur = mem.participants.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    mem.participants.set(id, next);
    return next;
  },
  async getParticipant(id) {
    return mem.participants.get(id) ?? null;
  },
  async listParticipants(code) {
    return [...mem.participants.values()]
      .filter((p) => p.sessionCode === code)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  },
};

/* ---------------- Firestore 어댑터 ---------------- */
const hasFirebase = () =>
  !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

let firestoreStore: Store | null = null;

function buildFirestoreStore(): Store {
  // firebase-admin 은 키가 있을 때만 로드한다.
  const admin = require("firebase-admin") as typeof import("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
  const db = admin.firestore();
  const sessions = () => db.collection("sessions");
  const participants = () => db.collection("participants");

  return {
    kind: "firestore",
    async createSession(code) {
      const s: SessionRecord = {
        sessionCode: code,
        status: "open",
        createdAt: new Date().toISOString(),
        closedAt: null,
        participantCount: 0,
      };
      try {
        await sessions().doc(code).create(s); // 이미 있으면 실패한다
      } catch {
        return null;
      }
      return s;
    },
    async getSession(code) {
      const d = await sessions().doc(code).get();
      return d.exists ? (d.data() as SessionRecord) : null;
    },
    async listSessions() {
      const q = await sessions().get();
      return q.docs.map((d) => d.data() as SessionRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async closeSession(code) {
      // update 는 문서가 없으면 실패하므로 사전 조회 없이 한 번의 왕복으로 처리한다.
      const patch = { status: "closed" as const, closedAt: new Date().toISOString() };
      try {
        await sessions().doc(code).update(patch);
      } catch {
        return false;
      }
      return true;
    },
    async deleteSessionCascade(code) {
      const q = await participants().where("sessionCode", "==", code).get();
      const batch = db.batch();
      q.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(sessions().doc(code));
      await batch.commit(); // 세션과 참여자를 한 배치로 지워 부분 삭제를 막는다.
      return q.size;
    },
    async createParticipant(p) {
      const ref = participants().doc();
      const rec: ParticipantRecord = { ...p, id: ref.id };
      // 참여자 문서 생성과 참여자 수 증가를 한 번의 커밋으로 처리한다.
      const batch = db.batch();
      batch.set(ref, rec);
      batch.update(sessions().doc(p.sessionCode), {
        participantCount: admin.firestore.FieldValue.increment(1),
      });
      await batch.commit();
      return rec;
    },
    async updateParticipant(id, patch) {
      const ref = participants().doc(id);
      const d = await ref.get();
      if (!d.exists) return null;
      await ref.set(patch, { merge: true });
      return { ...(d.data() as ParticipantRecord), ...patch };
    },
    async getParticipant(id) {
      const d = await participants().doc(id).get();
      return d.exists ? (d.data() as ParticipantRecord) : null;
    },
    async listParticipants(code) {
      const q = await participants().where("sessionCode", "==", code).get();
      return q.docs.map((d) => d.data() as ParticipantRecord).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    },
  };
}

export function getStore(): Store {
  if (!hasFirebase()) return memoryStore;
  if (!firestoreStore) firestoreStore = buildFirestoreStore();
  return firestoreStore;
}
