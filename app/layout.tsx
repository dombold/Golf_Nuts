import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Golf Nuts",
  description: "Older = Wiser — Golf scoring & stats for your group",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Golf Nuts",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/golf_nuts_badge.jpg", sizes: "192x192", type: "image/jpeg" },
    ],
    apple: "/golf_nuts_badge.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d6b2d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
