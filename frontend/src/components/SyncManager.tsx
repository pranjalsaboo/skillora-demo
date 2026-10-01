import { useEffect } from "react";
import { startSync } from "@/lib/sync";

export function SyncManager({ userId }: { userId: string }) {
  useEffect(() => startSync(userId), [userId]);
  return null;
}
