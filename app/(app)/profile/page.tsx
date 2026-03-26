import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import AvatarUpload from "@/components/AvatarUpload";
import PushNotificationToggle from "@/components/push/PushNotificationToggle";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
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
  });

  if (!user) redirect("/login");

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();

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

      <div className="bg-white rounded-2xl shadow-sm border border-fairway-100 p-6">
        <h2 className="text-lg font-semibold text-fairway-900 mb-4">Notifications</h2>
        <PushNotificationToggle />
      </div>
    </div>
  );
}
