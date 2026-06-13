"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_WARD_NAME } from "@/lib/constants";
import { RoleSwitcher } from "./role-switcher";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-[#005eb8] text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Discharge AI
            </Link>
            <p className="text-xs text-blue-100">{DEFAULT_WARD_NAME}</p>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/wards/4A"
              className={cn("hover:underline", pathname.startsWith("/wards") && "font-semibold underline")}
            >
              Ward dashboard
            </Link>
          </nav>
          <RoleSwitcher />
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t bg-white text-xs text-slate-500 px-4 py-2 text-center">
        AI outputs are draft-only and require authorised clinician review. Not for autonomous clinical decisions.
      </footer>
    </div>
  );
}
