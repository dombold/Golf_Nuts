"use client";

import { useState } from "react";

interface HoleCoords {
  teeLat?: number | null;
  teeLng?: number | null;
  greenLat?: number | null;
  greenLng?: number | null;
}

export default function HoleMap({ hole }: { hole: HoleCoords }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const hasCoords =
    hole.teeLat != null &&
    hole.teeLng != null &&
    hole.greenLat != null &&
    hole.greenLng != null;

  if (!hasCoords) {
    return (
      <div className="w-full aspect-video rounded-xl bg-fairway-50 border border-fairway-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">No map available</p>
      </div>
    );
  }

  const src = `/api/maps/hole-image?teeLat=${hole.teeLat}&teeLng=${hole.teeLng}&greenLat=${hole.greenLat}&greenLng=${hole.greenLng}`;

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-fairway-50 border border-fairway-100 relative">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading map…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-red-400">Map unavailable</p>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Hole satellite view"
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
