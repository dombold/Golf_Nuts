import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teeLat   = parseFloat(searchParams.get("teeLat")   ?? "");
  const teeLng   = parseFloat(searchParams.get("teeLng")   ?? "");
  const greenLat = parseFloat(searchParams.get("greenLat") ?? "");
  const greenLng = parseFloat(searchParams.get("greenLng") ?? "");

  if ([teeLat, teeLng, greenLat, greenLng].some(isNaN)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response("GOOGLE_MAPS_API_KEY not configured", { status: 503 });
  }

  const centerLat = (teeLat + greenLat) / 2;
  const centerLng = (teeLng + greenLng) / 2;

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${centerLat},${centerLng}`);
  url.searchParams.set("zoom", "17");
  url.searchParams.set("size", "640x360");
  url.searchParams.set("maptype", "satellite");
  url.searchParams.append("markers", `color:red|label:T|${teeLat},${teeLng}`);
  url.searchParams.append("markers", `color:white|label:G|${greenLat},${greenLng}`);
  url.searchParams.set("key", apiKey);

  const googleRes = await fetch(url.toString());
  if (!googleRes.ok) {
    return new Response("Failed to fetch map", { status: 502 });
  }

  return new Response(googleRes.body, {
    headers: {
      "Content-Type": googleRes.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
