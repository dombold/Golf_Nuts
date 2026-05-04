import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import EditEventForm from "@/components/tournament/EditEventForm";

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      course: {
        include: {
          tees: {
            orderBy: [
              { totalMeters: { sort: "desc", nulls: "last" } },
              { rating: "desc" },
            ],
          },
        },
      },
      tee: true,
    },
  });

  if (!tournament) notFound();
  if (tournament.createdById !== userId || tournament.status !== "UPCOMING") {
    redirect(`/tournaments/${id}`);
  }

  return (
    <EditEventForm
      tournament={{
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        date: tournament.date?.toISOString() ?? null,
        course: tournament.course
          ? {
              id: tournament.course.id,
              name: tournament.course.name,
              tees: tournament.course.tees.map((t) => ({
                id: t.id,
                name: t.name,
                rating: t.rating,
                slope: t.slope,
                par: t.par,
                totalMeters: t.totalMeters,
              })),
            }
          : null,
        tee: tournament.tee
          ? {
              id: tournament.tee.id,
              name: tournament.tee.name,
              rating: tournament.tee.rating,
              slope: tournament.tee.slope,
              par: tournament.tee.par,
              totalMeters: tournament.tee.totalMeters,
            }
          : null,
      }}
    />
  );
}
