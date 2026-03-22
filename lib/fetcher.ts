/**
 * Authenticated API calls (Supabase session cookie).
 * Do not send service role or admin tokens to the browser.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    success?: boolean;
  };
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "message" in json && json.message
        ? String(json.message)
        : `שגיאת רשת (${res.status})`
    );
  }
  return json as T;
}

/** @deprecated use apiFetch */
export const adminFetch = apiFetch;
