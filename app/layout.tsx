import type { Metadata } from "next";
import { ReportProblem } from "@/components/ReportProblem";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "MW Design | Mae's site",
  description: "Free 3D prints, games, and Study for Mae.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <ReportProblem />
      </body>
    </html>
  );
}
