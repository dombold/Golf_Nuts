"use client";

import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

type Passkey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
};

export default function PasskeyManager({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.PublicKeyCredential) {
      setSupported(false);
      return;
    }
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setSupported)
      .catch(() => setSupported(false));
  }, []);

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      const optRes = await fetch("/api/webauthn/register/options");
      if (!optRes.ok) throw new Error("Failed to get registration options");
      const options = await optRes.json();

      const attResp = await startRegistration(options);

      const verRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attResp, label: "This device" }),
      });
      if (!verRes.ok) {
        const data = await verRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Verification failed");
      }
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") return;
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/webauthn/credentials/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  if (supported === false) {
    return (
      <p className="text-sm text-gray-500">
        Biometric login is not available on this device.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {passkeys.length > 0 && (
        <ul className="space-y-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{pk.name}</p>
                <p className="text-xs text-gray-500">
                  Last used{" "}
                  {new Date(pk.lastUsedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                disabled={deleting === pk.id}
                className="text-xs font-medium text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded disabled:opacity-50 transition-colors"
                aria-label={`Remove ${pk.name}`}
              >
                {deleting === pk.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleRegister}
        disabled={loading || supported === null}
        className="w-full py-2.5 bg-[#2d6b2d] hover:bg-[#245824] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b2d] focus-visible:ring-offset-2"
      >
        {loading
          ? "Setting up…"
          : passkeys.length > 0
          ? "Add another device"
          : "Add Biometric Login"}
      </button>

      {passkeys.length === 0 && (
        <p className="text-xs text-gray-500">
          Use your fingerprint or Face ID to sign in instead of your password.
        </p>
      )}
    </div>
  );
}
