import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Golf Nuts",
    short_name: "Golf Nuts",
    description: "Older = Wiser — Golf scoring & stats for your group",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf8f2",
    theme_color: "#2d6b2d",
    orientation: "portrait",
    icons: [
      {
        src: "/golf_nuts_badge.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/golf_nuts_badge.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
