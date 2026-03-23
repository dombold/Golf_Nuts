import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      tees: {
        include: { holes: { orderBy: { number: "asc" } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">{course.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {[course.city, course.state, course.country].filter(Boolean).join(", ")}
        </p>
      </div>

      <Link
        href={`/rounds/new?courseId=${course.id}`}
        className="block w-full text-center bg-fairway-700 text-white py-3 rounded-xl font-semibold hover:bg-fairway-800 transition-colors"
      >
        ⛳ Start a round here
      </Link>

      {course.tees.map((tee) => (
        <div key={tee.id} className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
          <div className="bg-fairway-900 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold">{tee.name} Tees</span>
            <span className="text-fairway-300 text-sm">
              CR {tee.rating} / Slope {tee.slope} / Par {tee.par}
            </span>
          </div>
          {tee.holes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-fairway-50 text-fairway-700">
                    <th className="px-3 py-2 text-left">Hole</th>
                    <th className="px-3 py-2 text-center">Par</th>
                    <th className="px-3 py-2 text-center">SI</th>
                    <th className="px-3 py-2 text-center">Yards</th>
                  </tr>
                </thead>
                <tbody>
                  {tee.holes.map((hole, i) => (
                    <tr key={hole.id} className={i % 2 === 0 ? "" : "bg-fairway-50/50"}>
                      <td className="px-3 py-1.5 font-medium text-fairway-800">{hole.number}</td>
                      <td className="px-3 py-1.5 text-center">{hole.par}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{hole.strokeIndex}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{hole.distance ?? "—"}</td>
                    </tr>
                  ))}
                  <tr className="bg-fairway-100 font-semibold text-fairway-900">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-center">{tee.par}</td>
                    <td className="px-3 py-2 text-center">—</td>
                    <td className="px-3 py-2 text-center">
                      {tee.holes.reduce((s, h) => s + (h.distance ?? 0), 0) || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
