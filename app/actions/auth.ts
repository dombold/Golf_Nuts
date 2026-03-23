"use server";

import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";

const RegisterSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.email().trim(),
  password: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
});

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

export async function register(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { errors: { email: ["Email already registered"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
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
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard",
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return { message: "Invalid email or password" };
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
