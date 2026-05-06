"use server";

import { prisma } from "@/lib/prisma";
import { signIn, signOut, auth } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import crypto from "crypto";

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .trim(),
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.email("Invalid email address").trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain letters")
    .regex(/[0-9]/, "Password must contain numbers"),
  handicapIndex: z.coerce.number().min(0).max(54).default(0),
});

const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .trim(),
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.email("Invalid email address").trim(),
  handicapIndex: z.coerce.number().min(0, "Handicap must be 0 or above").max(54, "Handicap must be 54 or below"),
});

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function register(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = RegisterSchema.safeParse({
    username: formData.get("username"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    handicapIndex: formData.get("handicapIndex") || 0,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.email } }),
    prisma.user.findUnique({ where: { username: parsed.data.username } }),
  ]);

  if (existingEmail) {
    return { errors: { email: ["Email already registered"] } };
  }
  if (existingUsername) {
    return { errors: { username: ["Username already taken"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      username: parsed.data.username,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      email: parsed.data.email,
      passwordHash,
      handicapIndex: parsed.data.handicapIndex,
    },
  });

  sendWelcomeEmail(parsed.data.email, parsed.data.firstName).catch((err) =>
    console.error("[welcome-email] send failed:", err)
  );

  redirect("/login?registered=1");
}

export async function login(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await signIn("credentials", {
      usernameOrEmail: formData.get("usernameOrEmail") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }
    return { message: "Invalid username/email or password" };
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function verifyAndSignIn(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const token = formData.get("token") as string;
  if (!token) return { message: "Invalid reset link" };

  // Soft-check before attempting sign-in so we can return a user-friendly error
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) {
    return { message: "This reset link has expired or has already been used." };
  }

  try {
    await signIn("credentials", { resetToken: token, redirectTo: "/profile" });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    return { message: "This reset link has expired or has already been used." };
  }
}

const NewPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain letters")
      .regex(/[0-9]/, "Password must contain numbers"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) return { message: "Not authenticated" };

  const fromReset = session.user.loginMethod === "reset_token";

  const parsed = NewPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { message: "Not authenticated" };

  if (!fromReset) {
    const currentPassword = formData.get("currentPassword") as string;
    if (!currentPassword) {
      return { errors: { currentPassword: ["Current password is required"] } };
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return { errors: { currentPassword: ["Incorrect password"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });

  return { success: true, message: "Password changed successfully" };
}

export async function updateProfile(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "Not authenticated" };
  }
  const userId = session.user.id;

  const parsed = UpdateProfileSchema.safeParse({
    username: formData.get("username"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    handicapIndex: formData.get("handicapIndex"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Check username uniqueness (exclude current user)
  const existingUsername = await prisma.user.findFirst({
    where: {
      username: parsed.data.username,
      NOT: { id: userId },
    },
  });
  if (existingUsername) {
    return { errors: { username: ["Username already taken"] } };
  }

  const existingEmail = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      NOT: { id: userId },
    },
  });
  if (existingEmail) {
    return { errors: { email: ["Email already in use"] } };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      username: parsed.data.username,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      email: parsed.data.email,
      handicapIndex: parsed.data.handicapIndex,
    },
  });

  return { success: true, message: "Profile updated successfully" };
}
