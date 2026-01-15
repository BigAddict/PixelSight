import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelSight | Real-time AI Face & Hand Tracking",
  description: "Experience next-gen real-time face and hand detection with 3D visualization. Upload custom masks, track gestures, and explore AI in your browser.",
  keywords: ["AI", "Face Detection", "Hand Tracking", "MediaPipe", "React Three Fiber", "Computer Vision", "3D Visualization", "Augmented Reality"],
  authors: [{ name: "PixelSight Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#000000",
  openGraph: {
    title: "PixelSight | Real-time AI Tracking",
    description: "Next-gen real-time face & hand AI running directly in your browser.",
    type: "website",
    siteName: "PixelSight",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelSight AI",
    description: "Real-time 3D face & hand tracking in the browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
