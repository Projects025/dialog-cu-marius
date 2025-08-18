import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import BackgroundBlobs from "@/components/conversation/background-blobs";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Dialog cu Marius",
  description: "Generator de Aplicație Conversațională pentru Analiză Financiară",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          "relative min-h-screen bg-gradient-to-b from-[#FFDDC1] to-[#FFC3A0] font-sans antialiased",
          poppins.variable
        )}
      >
        <BackgroundBlobs />
        <main className="relative z-10">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
