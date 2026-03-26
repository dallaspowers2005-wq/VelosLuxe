const INTERNAL_KEY = typeof window !== "undefined"
  ? (sessionStorage.getItem("internalKey") || new URLSearchParams(window.location.search).get("key") || "")
  : "";

export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
      ...opts.headers,
    },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  return res.json();
}

export function getInternalKey(): string {
  if (typeof window === "undefined") return "";
  const urlKey = new URLSearchParams(window.location.search).get("key");
  if (urlKey) {
    sessionStorage.setItem("internalKey", urlKey);
    window.history.replaceState({}, "", window.location.pathname);
    return urlKey;
  }
  return sessionStorage.getItem("internalKey") || "";
}
