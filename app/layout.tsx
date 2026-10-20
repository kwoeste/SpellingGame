import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { KidPrefsProvider } from "@/components/ui/KidPrefs";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mae's Lab | MW Design",
  description: "Mae's learning lab and free 3D prints.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${baloo.variable}`}>
      <body>
        <KidPrefsProvider>
          <SiteHeader />
          {children}
        </KidPrefsProvider>
      </body>
    </html>
  );
}
