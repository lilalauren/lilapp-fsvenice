import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { CACHE_EVENT, formatSavedAt, readTripCache, registerOfflineWorker } from "@/lib/offline";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    registerOfflineWorker();
    const sync = () => {
      setOffline(!navigator.onLine);
      setSavedAt(readTripCache()?.savedAt ?? null);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener(CACHE_EVENT, sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener(CACHE_EVENT, sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="border-t border-border bg-muted">
      <p className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2 text-xs text-foreground">
        <WifiOff className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>Offline — showing saved info{savedAt ? ` from ${formatSavedAt(savedAt)}` : ""}.</span>
      </p>
    </div>
  );
}
