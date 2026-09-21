import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = id === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#fff",
          fontSize: Math.round(size * 0.52),
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: size * 0.18,
        }}
      >
        A
      </div>
    ),
    { width: size, height: size },
  );
}
