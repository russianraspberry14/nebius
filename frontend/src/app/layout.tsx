import type { Metadata } from "next";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import { Suspense } from "react";
import AuthProvider from "@/components/AuthProvider";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kindred",
  description: "A private notebook for the things that slip through a busy mind.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${schibsted.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Suspense fallback={null}>
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
