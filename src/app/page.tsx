"use client";

import { useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import TestFlow from "@/components/TestFlow";

export default function Page() {
  // 학습자 화면과 관리자 화면은 같은 주소에서 전환된다.
  const [admin, setAdmin] = useState(false);
  return admin ? <AdminPanel onExit={() => setAdmin(false)} /> : <TestFlow onAdmin={() => setAdmin(true)} />;
}
