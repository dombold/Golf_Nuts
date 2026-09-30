import { auth, isFreshResetSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import AvatarUpload from "@/components/AvatarUpload";
import PushNotificationToggle from "@/components/push/PushNotificationToggle";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import PasskeyManager from "@/components/PasskeyManager";
import GuestRow from "@/components/guests/GuestRow";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, passkeys, guests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        handicapIndex: true,
        createdAt: true,
        avatarUrl: true,
      },
    }),
    prisma.webAuthnCredential.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    // Guest players I added who haven't been assigned to a member yet
    prisma.user.findMany({
      where: { isGuest: true, guestCreatedById: session.user.id },
      select: {
        id: true,
        name: true,
        firstName: true,
        handicapIndex: true,
        createdAt: true,
        rounds: { select: { _count: { select: { scores: true } } } },
        _count: { select: { tournamentInvitations: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = `${user.firstName?.[0] ?? "?"}${user.lastName?.[0] ?? "?"}`.toUpperCase();

  const fromReset = isFreshResetSession(session.user);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <AvatarUpload currentAvatarUrl={user.avatarUrl ?? null} initials={initials} />
        <div>
          <h1 className="text-2xl font-bold text-fairway-900">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-500 text-sm">@{user.username}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-fairway-100 p-6">
        <h2 className="text-lg font-semibold text-fairway-900 mb-4">Profile Settings</h2>
        <ProfileForm
          username={user.username}
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          handicapIndex={user.handicapIndex}
          memberSince={memberSince}
        />
      </div>

      {guests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-fairway-100 overflow-hidden">
          <div className="px-6 pt-6 pb-3">
            <h2 className="text-lg font-semibold text-fairway-900">My Guest Players</h2>
            <p className="text-sm text-gray-500 mt-1">
              Guests you&apos;ve added to events and rounds. When one registers, assign their scores to their
              account. Unclaimed guests are anonymised after 12 months.
            </p>
          </div>
          <div className="divide-y divide-gray-50 border-t border-gray-100">
            {guests.map((g) => {
              const rounds = g.rounds.length;
              const hasScores = g.rounds.some((r) => r._count.scores > 0);
              const where = rounds > 0
                ? `${rounds} round${rounds !== 1 ? "s" : ""}`
                : `${g._count.tournamentInvitations} upcoming event${g._count.tournamentInvitations !== 1 ? "s" : ""}`;
              const added = g.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
              return (
                <GuestRow
                  key={g.id}
                  guest={g}
                  detail={`${where} · added ${added}`}
                  canAssign
                  canRemove={!hasScores}
                  canAnonymise={g.firstName !== "Guest"}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-fairway-100 p-6">
        <h2 className="text-lg font-semibold text-fairway-900 mb-4">Password</h2>
        <ChangePasswordForm fromReset={fromReset} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-fairway-100 p-6">
        <h2 className="text-lg font-semibold text-fairway-900 mb-4">Notifications</h2>
        <PushNotificationToggle />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-fairway-100 p-6">
        <h2 className="text-lg font-semibold text-fairway-900 mb-4">Biometric Login</h2>
        <PasskeyManager
          passkeys={passkeys.map((p) => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
            lastUsedAt: p.lastUsedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
