const chunkReloadKey = "erp:chunk-reload-attempted-at";
const dynamicImportFailurePatterns = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Loading chunk",
  "ChunkLoadError",
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

export function isDynamicImportFailure(error: unknown) {
  const message = getErrorMessage(error);
  return dynamicImportFailurePatterns.some((pattern) => message.includes(pattern));
}

export async function clearBrowserRuntimeCaches() {
  if (typeof window === "undefined") {
    return;
  }

  const tasks: Promise<unknown>[] = [];

  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
    );
  }

  if ("caches" in window) {
    tasks.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }

  await Promise.allSettled(tasks);
}

export function reloadAfterChunkFailure() {
  if (typeof window === "undefined") {
    return false;
  }

  const lastAttempt = Number(sessionStorage.getItem(chunkReloadKey) ?? 0);
  if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 30_000) {
    return false;
  }

  sessionStorage.setItem(chunkReloadKey, String(Date.now()));
  void clearBrowserRuntimeCaches().finally(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", String(Date.now()));
    window.location.replace(url);
  });

  return true;
}

