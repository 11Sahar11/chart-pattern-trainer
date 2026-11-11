import { dateKey } from "@/lib/progress";

const KEY = "cpt-reminder";
const DB = "cpt";
const STORE = "kv";

export type ReminderChoice = "on" | "off" | "denied" | "unset";

export function reminderChoice(): ReminderChoice {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "on" || value === "off" || value === "denied") return value;
  } catch {
    // ignore
  }
  return "unset";
}

export function dismissReminder() {
  try {
    localStorage.setItem(KEY, "off");
  } catch {
    // ignore
  }
}

/** Next local mornings at `hour`, skipping a time that has already passed today. */
export function upcomingMornings(now = new Date(), hour = 9, days = 3): Date[] {
  const start = new Date(now);
  start.setHours(hour, 0, 0, 0);
  if (start.getTime() <= now.getTime()) start.setDate(start.getDate() + 1);
  return Array.from({ length: days }, (_, i) => {
    const at = new Date(start);
    at.setDate(start.getDate() + i);
    return at;
  });
}

/**
 * Ask for Notification permission. Only call this from a button click.
 * Never call it on load.
 */
export async function enableDailyReminder(): Promise<"on" | "denied" | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") {
    try {
      localStorage.setItem(KEY, "denied");
    } catch {
      // ignore
    }
    return "denied";
  }
  try {
    localStorage.setItem(KEY, "on");
  } catch {
    // ignore
  }
  await scheduleDailyReminder();
  return "on";
}

/** Refresh the queued pings. Does not request permission. */
export async function scheduleDailyReminder() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (reminderChoice() !== "on") return;
  const reg = await currentRegistration();
  if (!reg) return;
  const Trigger = (window as Window & { TimestampTrigger?: new (when: number) => unknown }).TimestampTrigger;
  if (typeof Trigger === "function") {
    try {
      for (const at of upcomingMornings()) {
        const day = dateKey(at);
        await reg.showNotification("Daily Chart is ready", {
          body: "Five charts. Keep your streak.",
          tag: `cpt-daily-${day}`,
          data: { url: "/daily" },
          showTrigger: new Trigger(at.getTime()),
        } as NotificationOptions);
      }
      return;
    } catch {
      // This browser has no scheduled notifications. Try a periodic sync.
    }
  }
  const periodic = (reg as ServiceWorkerRegistration & {
    periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
  }).periodicSync;
  if (!periodic) return;
  try {
    await periodic.register("cpt-daily", { minInterval: 24 * 60 * 60 * 1000 });
  } catch {
    // The opt-in is saved. The browser decides when a periodic sync may run.
  }
}

/** So a scheduled ping can stay quiet on a day already played. */
export async function noteDailyDone(date: string) {
  await idbSet("daily-done", date);
  const reg = await currentRegistration();
  if (!reg) return;
  try {
    const notes = await reg.getNotifications({ tag: `cpt-daily-${date}` });
    for (const note of notes) note.close();
  } catch {
    // ignore
  }
}

async function currentRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

function idbSet(key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onerror = () => resolve();
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    };
  });
}
