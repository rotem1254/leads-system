/**
 * Map PostgREST / Supabase client errors to HTTP responses (no secrets logged).
 * @see https://postgrest.org/en/stable/errors.html
 */

export type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

/** Table/view missing from schema cache — migrations not applied or not reloaded. */
export function isSchemaCacheMissingError(err: unknown): boolean {
  const e = err as SupabaseLikeError;
  if (e.code === "PGRST205" || e.code === "42P01") return true;
  const m = e.message ?? "";
  return (
    m.includes("Could not find the table") && m.includes("schema cache")
  );
}

/** Column missing — partial migration. */
export function isUndefinedColumnError(err: unknown): boolean {
  const e = err as SupabaseLikeError;
  const m = e.message ?? "";
  return (
    e.code === "42703" ||
    /column .* does not exist/i.test(m) ||
    /Could not find the .* column/i.test(m)
  );
}

/** FK violation (e.g. invalid user_id / landing_page_id). */
export function isForeignKeyViolationError(err: unknown): boolean {
  const e = err as SupabaseLikeError;
  const m = e.message ?? "";
  return (
    e.code === "23503" ||
    /foreign key constraint/i.test(m) ||
    /violates foreign key constraint/i.test(m)
  );
}

export function formatSupabaseErrorForLog(err: unknown): string {
  const e = err as SupabaseLikeError;
  return [e.code, e.message, e.details].filter(Boolean).join(" | ");
}

export function formatErrorStackForLog(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}
