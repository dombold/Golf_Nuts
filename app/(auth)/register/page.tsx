"use client";

import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, undefined);

  return (
    <>
      <h1 className="text-2xl font-bold text-fairway-900 mb-6 text-center">
        Create your account
      </h1>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          {state?.errors?.name && (
            <p className="text-red-600 text-xs mt-1">{state.errors.name[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          {state?.errors?.email && (
            <p className="text-red-600 text-xs mt-1">{state.errors.email[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Min 8 chars, letters and numbers"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          {state?.errors?.password && (
            <p className="text-red-600 text-xs mt-1">{state.errors.password[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-fairway-700 hover:bg-fairway-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-fairway-700 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
