"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/constants";

interface DevUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function RoleSwitcher() {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [current, setCurrent] = useState<DevUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (data) => {
        setUsers(data.users ?? []);
        if (data.user) {
          setCurrent(data.user);
        } else if (data.users?.length > 0) {
          const doctor = data.users.find((u: DevUser) => u.role === "DOCTOR") ?? data.users[0];
          await switchUser(doctor.id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchUser(userId: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    setCurrent(data.user);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden sm:inline text-blue-100">Demo user:</span>
      <select
        className="rounded border border-blue-300 bg-white px-2 py-1 text-slate-900 text-sm max-w-[180px]"
        value={current?.id ?? ""}
        onChange={(e) => switchUser(e.target.value)}
      >
        <option value="" disabled>
          Select role…
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({ROLE_LABELS[u.role] ?? u.role})
          </option>
        ))}
      </select>
    </div>
  );
}
