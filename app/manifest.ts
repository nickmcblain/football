import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bombers FC",
    short_name: "Bombers",
    description: "Fixtures, teams, and the Bombers table.",
    start_url: "/leaderboard",
    display: "standalone",
    background_color: "#eef0f4",
    theme_color: "#eef0f4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
