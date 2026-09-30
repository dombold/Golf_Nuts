"use client";

import { useId, useState } from "react";
import { GuestInputSchema, guestNameProblem } from "@/lib/guestNames";

interface Props {
  /** Save the guest; resolve to an error message to show, or null on success. */
  onAdd: (guest: { name: string; handicapIndex: number }) => Promise<string | null> | string | null;
  /** Guests already in this event/round — checked before saving so duplicates are caught early. */
  otherGuestNames: string[];
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * "+ Add guest player" — a name and Handicap Index for someone who isn't registered.
 * The server re-checks the name (it mustn't match a registered member).
 */
export default function AddGuestForm({ onAdd, otherGuestNames, disabled, disabledReason }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setName("");
    setHandicap("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = GuestInputSchema.safeParse({ name, handicapIndex: handicap === "" ? NaN : Number(handicap) });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.path[0] === "handicapIndex" && handicap === "" ? "Enter the guest's Handicap Index" : issue?.message ?? "Check the details");
      return;
    }
    const problem = guestNameProblem(parsed.data.name, otherGuestNames);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    const result = await onAdd(parsed.data);
    setSaving(false);
    if (result) setError(result);
    else close();
  }

  if (!open) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="w-full py-2.5 border border-dashed border-acorn-300 text-acorn-700 rounded-xl text-sm font-medium hover:bg-acorn-50 active:bg-acorn-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add guest player
        </button>
        {disabled && disabledReason && <p className="text-xs text-gray-500 text-center">{disabledReason}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-acorn-200 bg-acorn-50 p-4 space-y-3" noValidate>
      <div>
        <p className="text-sm font-semibold text-acorn-800">Add a guest player</p>
        <p className="text-xs text-acorn-700 mt-0.5">
          For someone who isn&apos;t registered. A playing partner enters their scores.
        </p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor={`${id}-name`} className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="off"
            autoFocus
            placeholder="e.g. Pete Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
        </div>
        <div className="w-24 shrink-0">
          <label htmlFor={`${id}-hcp`} className="block text-xs font-medium text-gray-600 mb-1">Handicap</label>
          <input
            id={`${id}-hcp`}
            value={handicap}
            onChange={(e) => setHandicap(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={54}
            placeholder="18.0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={close}
          className="flex-1 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 bg-fairway-700 text-white rounded-lg text-sm font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2"
        >
          {saving ? "Adding…" : "Add guest"}
        </button>
      </div>
    </form>
  );
}
