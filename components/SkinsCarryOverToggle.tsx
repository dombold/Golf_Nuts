"use client";

/** Skins option: does a halved hole's skin roll on to the next hole? Shown when the format is Skins. */
export default function SkinsCarryOverToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-fairway-200 bg-fairway-50 px-4 py-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-fairway-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
      />
      <span>
        <span className="block text-sm font-medium text-fairway-900">Carry over halved holes</span>
        <span className="block text-xs text-gray-600 mt-0.5">
          {checked
            ? "A halved hole's skin rolls on to the next hole, so one win can be worth several skins."
            : "A halved hole's skin is lost — every skin is worth 1."}
        </span>
      </span>
    </label>
  );
}
