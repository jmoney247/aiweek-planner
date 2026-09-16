import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { SessionGateProvider } from "@/components/SessionGateProvider";

export const metadata: Metadata = {
  title: "Boston AI Week",
  description:
    "Discover Boston AI Week events — what is happening, what is worth attending, and how to register.",
};

export const viewport: Viewport = {
  themeColor: "#FFF8F0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SessionGateProvider>
          <Header />
          {children}
          <SiteFooter />
        </SessionGateProvider>
      </body>
    </html>
  );
}
