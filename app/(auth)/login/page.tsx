"use client";

import { useActionState, useEffect, useState } from "react";
import { login } from "@/app/actions/auth";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 17c1 .5 2.6 1.5 4 1.5" />
      <path d="M20 12c.7 2 .5 6.4-1.3 9" />
      <path d="M5.5 15.5c.5-1.5.5-5.5 1-7.5" />
      <path d="M8.5 8a5 5 0 0 1 8 4.8" />
    </svg>
  );
}

function BiometricButton() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.PublicKeyCredential) return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((ok) => setSupported(ok))
      .catch(() => {});
  }, []);

  if (!supported) return null;

  async function handleBiometric() {
    setLoading(true);
    setError(null);
    try {
      const optRes = await fetch("/api/webauthn/auth/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!optRes.ok) throw new Error("Failed to get options");
      const options = await optRes.json();

      const assertion = await startAuthentication(options);

      const verRes = await fetch("/api/webauthn/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      const data = await verRes.json();
      if (!verRes.ok) throw new Error(data.error ?? "Authentication failed");

      window.location.href = data.redirectTo ?? "/dashboard";
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") return;
      setError(err instanceof Error ? err.message : "Biometric login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="relative flex items-center my-4">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 text-xs text-gray-400">or</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleBiometric}
        disabled={loading}
        className="w-full py-2.5 border border-fairway-700 text-fairway-700 hover:bg-fairway-50 font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2"
      >
        <FingerprintIcon />
        {loading ? "Verifying…" : "Use Biometrics"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus-visible:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-fairway-700 hover:bg-fairway-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <BiometricButton />

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
