import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "client"]);

const email = z.string().trim().toLowerCase().email("אימייל לא תקין");
const password = z.string().min(8, "סיסמה — לפחות 8 תווים").max(200);

export const createUserSchema = z.object({
  email: email,
  password: password,
  full_name: z.string().trim().min(1).max(200),
  role: userRoleSchema,
});

export const updateUserSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200).optional(),
    is_active: z.boolean().optional(),
    role: userRoleSchema.optional(),
    password: z.union([z.literal(""), password]).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "נדרש לפחות שדה אחד לעדכון",
  });
