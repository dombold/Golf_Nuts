"use server";

import { prisma } from "@/lib/prisma";
import { signIn, signOut, auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";

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
