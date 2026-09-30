"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

export interface EditableMember { id: string; username: string; firstName: string; lastName: string; email: string }

/** Admin edits a member's name, username and email. */
export default function MemberEditForm({ member, onDone }: { member: EditableMember; onDone: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: member.username, firstName: member.firstName, lastName: member.lastName, email: member.email });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/users/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      onDone();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't save") : "Couldn't reach the server");
    }
    setBusy(false);
  }

  const fields = [
    { key: "firstName", label: "First name", type: "text", autoComplete: "off" },
    { key: "lastName", label: "Last name", type: "text", autoComplete: "off" },
    { key: "username", label: "Username", type: "text", autoComplete: "off" },
    { key: "email", label: "Email", type: "email", autoComplete: "off" },
  ] as const;

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="block text-xs font-medium text-gray-600">
            {f.label}
            <input
              type={f.type}
              autoComplete={f.autoComplete}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
