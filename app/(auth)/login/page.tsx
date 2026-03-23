"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <>
      <h1 className="text-2xl font-bold text-fairway-900 mb-6 text-center">
        Sign in to Golf Nuts
      </h1>

      {state?.message && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {state.message}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username or Email
          </label>
          <input
            name="usernameOrEmail"
            type="text"
            required
            autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-fairway-700 hover:bg-fairway-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        No account?{" "}
        <Link href="/register" className="text-fairway-700 font-medium hover:underline">
          Register
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/reset-password" className="text-gray-500 hover:underline text-xs">
          Forgot password?
        </Link>
      </p>
    </>
  );
}
