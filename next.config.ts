import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/store.html", destination: "/store", permanent: false },
      { source: "/thank-you.html", destination: "/thank-you", permanent: false },
      { source: "/games.html", destination: "/games", permanent: false },
      { source: "/spelling-game.html", destination: "/spelling-game", permanent: false },
      { source: "/number-match.html", destination: "/number-match", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/study/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/games/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
