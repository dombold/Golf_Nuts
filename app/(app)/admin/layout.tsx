import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import AdminTabs from "@/components/admin/AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Non-admins get a plain 404 — the admin area doesn't advertise itself
  if (!session?.user || !(await isAdmin(session.user.id))) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">Admin</h1>
        <p className="text-sm text-gray-500">
          Administrators can act as organiser on every event and round. Changes to other people&apos;s things are recorded in the audit log.
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
