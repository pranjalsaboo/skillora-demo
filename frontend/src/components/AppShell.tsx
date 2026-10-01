import type { ReactNode } from "react";
import { BottomNav, StatsBar } from "./StatsBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StatsBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
