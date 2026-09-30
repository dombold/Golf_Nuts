"use client";

import { useState } from "react";
import ConfirmAction from "@/components/admin/ConfirmAction";
import DeleteMembers from "@/components/admin/DeleteMembers";
import HandicapTool from "@/components/admin/HandicapTool";
import MemberEditForm from "@/components/admin/MemberEditForm";
import PasswordResetButton from "@/components/admin/PasswordResetButton";

export interface AdminMember {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  handicapIndex: number;
  isAdmin: boolean;
  joined: string;
  rounds: number;
}

type Panel = "edit" | "reset" | "handicap";

export default function MembersManager({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ id: string; panel: Panel } | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function togglePanel(id: string, panel: Panel) {
    setOpen(open?.id === id && open.panel === panel ? null : { id, panel });
  }

  // Drop selections for members that have since been deleted
  const selectedIds = members.filter((m) => selected.has(m.id)).map((m) => m.id);
  const adminCount = members.filter((m) => m.isAdmin).length;
  const btn = "text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";

  return (
    <div className="space-y-3">
      <DeleteMembers userIds={selectedIds} onDone={() => setSelected(new Set())} />

      <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {members.map((m) => {
          const isMe = m.id === currentUserId;
          const panel = open?.id === m.id ? open.panel : null;
          return (
            <li key={m.id} className="px-4 py-3 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  disabled={isMe || m.isAdmin}
                  aria-label={`Select ${m.name} for deletion`}
                  title={isMe ? "You can't delete yourself" : m.isAdmin ? "Remove admin access before deleting" : undefined}
                  className="mt-1 accent-red-600 disabled:opacity-30"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {m.name}
                    {m.isAdmin && (
                      <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-acorn-100 text-acorn-800">
                        Admin
                      </span>
                    )}
                    {isMe && <span className="ml-1 text-xs text-gray-500">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 break-all">@{m.username} · {m.email}</p>
                  <p className="text-xs text-gray-500">
                    Handicap {m.handicapIndex.toFixed(1)} · {m.rounds} round{m.rounds === 1 ? "" : "s"} · joined {m.joined}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                {(["edit", "reset", "handicap"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePanel(m.id, p)}
                    aria-expanded={panel === p}
                    className={`${btn} border ${panel === p ? "border-fairway-700 bg-fairway-50 text-fairway-800" : "border-fairway-200 text-fairway-700 hover:bg-fairway-50"}`}
                  >
                    {{ edit: "Edit details", reset: "Password", handicap: "Handicap" }[p]}
                  </button>
                ))}
                {m.isAdmin ? (
                  !isMe && adminCount > 1 && (
                    <ConfirmAction url={`/api/admin/users/${m.id}`} method="PATCH" body={{ isAdmin: false }} label="Remove admin" confirmLabel="Remove admin" danger />
                  )
                ) : (
                  <ConfirmAction
                    url={`/api/admin/users/${m.id}`}
                    method="PATCH"
                    body={{ isAdmin: true }}
                    label="Make admin"
                    confirmLabel="Make admin"
                    prompt={`${m.name.split(" ")[0]} will be able to manage everything.`}
                  />
                )}
              </div>

              {panel && (
                <div className="rounded-lg border border-fairway-100 bg-cream p-3">
                  {panel === "edit" && <MemberEditForm member={m} onDone={() => setOpen(null)} />}
                  {panel === "reset" && <PasswordResetButton userId={m.id} name={m.name} />}
                  {panel === "handicap" && <HandicapTool userId={m.id} onDone={() => setOpen(null)} />}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
