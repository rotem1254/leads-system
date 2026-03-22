import { z } from "zod";

export const leadStatusSchema = z.enum([
  "new",
  "in_progress",
  "closed",
  "irrelevant",
]);

const nonEmptyTrimmed = z
  .string()
  .trim()
  .min(1, "שדה חובה");

const landingToken = z
  .string()
  .trim()
  .min(1, "נדרש landing_token")
  .max(120);

/** Public payload from external landing pages */
export const createLeadPublicSchema = z.object({
  full_name: nonEmptyTrimmed.max(200),
  phone: nonEmptyTrimmed.max(40),
  email: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) =>
      v === null || v === undefined || String(v).trim() === ""
        ? undefined
        : String(v).trim()
    )
    .pipe(z.union([z.undefined(), z.string().max(320).email("אימייל לא תקין")])),
  message: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return undefined;
      const t = String(v).trim();
      return t === "" ? undefined : t.slice(0, 5000);
    }),
  page_source: nonEmptyTrimmed.max(200),
  landing_token: landingToken,
});

export type CreateLeadPublicInput = z.infer<typeof createLeadPublicSchema>;

/** Admin PATCH — partial update */
export const updateLeadAdminSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(1).max(40).optional(),
    email: z
      .union([z.literal(""), z.string().email(), z.null()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    message: z.string().trim().max(5000).nullable().optional(),
    page_source: z.string().trim().min(1).max(200).optional(),
    status: leadStatusSchema.optional(),
    notes: z.string().max(10000).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "נדרש לפחות שדה אחד לעדכון",
  });

export type UpdateLeadAdminInput = z.infer<typeof updateLeadAdminSchema>;

/** Client PATCH — ownership enforced in route */
export const updateLeadClientSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(1).max(40).optional(),
    email: z
      .union([z.literal(""), z.string().email(), z.null()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    message: z.string().trim().max(5000).nullable().optional(),
    status: leadStatusSchema.optional(),
    notes: z.string().max(10000).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "נדרש לפחות שדה אחד לעדכון",
  });

export type UpdateLeadClientInput = z.infer<typeof updateLeadClientSchema>;

function emptyToUndefined(v: unknown): undefined | string {
  if (v === undefined || v === null || v === "") return undefined;
  return String(v);
}

/**
 * Query string params for GET /api/leads.
 * Invalid values (e.g. non-numeric page) fail validation — strict and safe.
 */
export const adminLeadListQuerySchema = z
  .object({
    page: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      if (e === undefined) return 1;
      const n = Number(e);
      return Number.isFinite(n) ? n : Number.NaN;
    }, z.number().int().min(1).max(10000)),
    limit: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      if (e === undefined) return 20;
      const n = Number(e);
      return Number.isFinite(n) ? n : Number.NaN;
    }, z.number().int().min(1).max(100)),
    q: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      if (e === undefined) return undefined;
      const t = e.trim().replace(/[%*,]/g, "").slice(0, 120);
      return t === "" ? undefined : t;
    }, z.string().optional()),
    status: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      return e === undefined ? undefined : e;
    }, leadStatusSchema.optional()),
    page_source: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      if (e === undefined) return undefined;
      const t = e.trim().slice(0, 200);
      return t === "" ? undefined : t;
    }, z.string().optional()),
    user_id: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      if (e === undefined) return undefined;
      const t = e.trim();
      return t === "" ? undefined : t;
    }, z.string().uuid().optional()),
    landing_page_id: z.preprocess((v) => {
      const e = emptyToUndefined(v);
      if (e === undefined) return undefined;
      const t = e.trim();
      return t === "" ? undefined : t;
    }, z.string().uuid().optional()),
  });

export type AdminLeadListQueryOut = z.infer<typeof adminLeadListQuerySchema>;
