import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fairway-900 px-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/golf_nuts_badge.jpg"
          alt="Golf Nuts"
          width={120}
          height={120}
          className="rounded-full shadow-lg"
        />
        <p className="text-fairway-200 text-sm font-medium tracking-widest uppercase">
          Older = Wiser
        </p>
      </div>
      <div className="w-full max-w-md bg-scorecard rounded-2xl shadow-xl p-8">
        {children}
      </div>
    </div>
  );
}
