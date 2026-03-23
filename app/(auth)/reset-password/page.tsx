"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-fairway-700 font-semibold text-lg mb-2">Check your email</p>
        <p className="text-gray-600 text-sm">
          If that address is registered, a reset link has been sent.
        </p>
        <Link href="/login" className="mt-4 inline-block text-fairway-700 text-sm hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fairway-900 mb-2 text-center">
        Reset password
      </h1>
      <p className="text-gray-500 text-sm text-center mb-6">
        Enter your email and we&apos;ll send a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-fairway-700 hover:bg-fairway-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-center">
        <Link href="/login" className="text-gray-500 text-sm hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
