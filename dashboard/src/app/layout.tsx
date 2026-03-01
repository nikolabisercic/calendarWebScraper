import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
  title: "Rental Tracker | Occupancy Analytics",
  description: "Occupancy analytics for weekendica.com rental properties",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="border-b">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
              <Link href="/" className="text-lg font-semibold">
                Rental Tracker
              </Link>
              <nav className="flex flex-1 gap-4 text-sm text-muted-foreground">
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Overview
                </Link>
                <Link
                  href="/properties"
                  className="hover:text-foreground transition-colors"
                >
                  Properties
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
