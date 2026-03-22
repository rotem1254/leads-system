import { z } from "zod";

const uuid = z.string().uuid();

export const createLandingPageSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).optional(),
  user_id: uuid,
  is_active: z.boolean().optional(),
});

export const updateLandingPageSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(120).optional(),
    user_id: uuid.optional(),
    is_active: z.boolean().optional(),
    /** אם true — נוצר מחדש public_token (מנהלים בלבד) */
    regenerate_token: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "נדרש לפחות שדה אחד לעדכון",
  });
