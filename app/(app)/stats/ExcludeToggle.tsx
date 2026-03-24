"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  roundId: string;
  excluded: boolean;
}

export default function ExcludeToggle({ roundId, excluded }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await fetch(`/api/rounds/${roundId}/exclude`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclude: !excluded }),
    });
    router.refresh();
    setPending(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={excluded ? "Excluded from handicap — click to include" : "Included in handicap — click to exclude"}
      className={[
        "w-7 h-4 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-600 focus-visible:ring-offset-1",
        excluded
          ? "bg-gray-300"
          : "bg-fairway-600",
        pending ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      aria-pressed={!excluded}
      aria-label={excluded ? "Excluded from handicap" : "Included in handicap"}
    >
      <span
        className={[
          "block w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-150 mx-0.5",
          excluded ? "translate-x-0" : "translate-x-3",
        ].join(" ")}
      />
    </button>
  );
}
