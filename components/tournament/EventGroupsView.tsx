import GuestBadge from "@/components/guests/GuestBadge";
import { teamsInGroup } from "@/lib/teams";

interface Member {
  id: string;
  name: string;
  isGuest: boolean;
  teamNumber: number | null;
}

interface Group {
  groupNumber: number;
  teeName?: string;
  members: Member[];
}

interface Props {
  groups: Group[];
  /** Players per team (1 = individual game) */
  teamSize: number;
  currentUserId: string;
  showTees: boolean;
}

function MemberList({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  return (
    <ul className="space-y-1">
      {[...members]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => {
          const isMe = m.id === currentUserId;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                isMe ? "bg-fairway-100 text-fairway-900 font-medium" : "bg-fairway-50 text-fairway-900"
              }`}
            >
              <span className="break-words">{m.name}</span>
              {m.isGuest && <GuestBadge />}
              {isMe && <span className="ml-auto text-xs font-semibold text-fairway-700">You</span>}
            </li>
          );
        })}
    </ul>
  );
}

/** Read-only view of an event's groups and teams, for players who can't edit them. */
export default function EventGroupsView({ groups, teamSize, currentUserId, showTees }: Props) {
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <section
          key={g.groupNumber}
          aria-label={`Group ${g.groupNumber}`}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-fairway-900">Group {g.groupNumber}</h3>
            <span className="text-xs text-gray-500">
              {teamSize === 4 && "One team"}
              {teamSize === 4 && showTees && g.teeName && " · "}
              {showTees && g.teeName && `${g.teeName} tees`}
            </span>
          </div>

          {teamSize === 2 ? (
            <div className="space-y-2">
              {teamsInGroup(g.members).map(([t, members]) => (
                <div key={t}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {t ? `Team ${t}` : "No team"}
                  </p>
                  <MemberList members={members} currentUserId={currentUserId} />
                </div>
              ))}
            </div>
          ) : (
            <MemberList members={g.members} currentUserId={currentUserId} />
          )}

          {g.members.length === 0 && <p className="text-xs text-gray-400 text-center py-1">No players yet</p>}
        </section>
      ))}
    </div>
  );
}
