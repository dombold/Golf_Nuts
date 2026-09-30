/** Small "Guest" pill shown next to an unregistered player's name. */
export default function GuestBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-acorn-100 text-acorn-700 ${className}`}
    >
      Guest
    </span>
  );
}
