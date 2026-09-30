import { z } from "zod";

/** A member's editable identity — shared by the profile form and Admin → Members. */
export const MemberDetailsSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .refine((u) => !/^guest_/i.test(u), "Usernames starting with guest_ are reserved")
    .trim(),
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.email("Invalid email address").trim(),
});
