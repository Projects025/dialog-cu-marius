
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import FirebaseErrorListener from "@/components/FirebaseErrorListener";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "PoliSafe",
  description: "Asistentul tău financiar inteligent",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full max-h-[-webkit-fill-available]">
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
          "relative h-full max-h-[-webkit-fill-available] font-sans antialiased",
          poppins.variable
        )}
      >
        <FirebaseErrorListener />
        <main className="relative z-10 h-full">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
