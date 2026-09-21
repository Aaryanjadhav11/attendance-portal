import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RITCMS Attendance",
    short_name: "Attendance",
    description:
      "Track your RITCMS attendance and see how many lectures you can skip or need to attend.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#171717",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
