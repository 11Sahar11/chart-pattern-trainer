import { useEffect } from "react";

/** Registers /sw.js in production builds so the installed app opens offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    // Skip when embedded in another page (previews); only the real app installs it.
    if (window.self !== window.top) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  }, []);
  return null;
}
