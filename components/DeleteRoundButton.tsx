"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteRoundButton({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
    router.push("/dashboard");
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
    <button
      onClick={() => setConfirming(true)}
      className="py-3 px-4 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors text-sm"
    >
      Delete
    </button>
  );
}
