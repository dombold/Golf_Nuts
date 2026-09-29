"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

export default function DeleteRoundButton({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/rounds/${roundId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.push("/dashboard");
      return;
    }
    setError(res ? await apiErrorMessage(res, "Couldn't delete the round.") : "Couldn't reach the server.");
    setDeleting(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 text-sm"
        >
          {deleting ? "Deleting…" : "Confirm Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setConfirming(true)}
        className="py-3 px-4 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors text-sm"
      >
        Delete
      </button>
      {error && <p role="alert" className="text-xs text-red-600 max-w-40">{error}</p>}
    </div>
  );
}
