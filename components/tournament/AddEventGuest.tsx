"use client";

import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import AddGuestForm from "@/components/guests/AddGuestForm";

/** Organiser adds a guest player to an upcoming event (they're accepted straight away). */
export default function AddEventGuest({ tournamentId, guestNames }: { tournamentId: string; guestNames: string[] }) {
  const router = useRouter();

  async function add(guest: { name: string; handicapIndex: number }) {
    const res = await fetch(`/api/tournaments/${tournamentId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guest),
    }).catch(() => null);
    if (!res) return "Couldn't reach the server";
    if (!res.ok) return apiErrorMessage(res, "Couldn't add the guest");
    router.refresh();
    return null;
  }

  return <AddGuestForm onAdd={add} otherGuestNames={guestNames} />;
}
