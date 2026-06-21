import type { Metadata, Viewport } from "next";
import "./globals.css";
import SystemNav from "@/components/SystemNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "The System — Hunter Log",
  description: "Solo Leveling themed journal & quest tracker. Clear quests. Level up. Arise.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "The System" },
};

export const viewport: Viewport = {
  themeColor: "#04060d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col pb-16">
        {children}
        <SystemNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
