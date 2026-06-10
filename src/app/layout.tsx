import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ForumScrollPersistence } from "@/components/forum/ForumScrollPersistence";
import { ForumScrollRestore } from "@/components/forum/ForumScrollRestore";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "District Roleplay Forum",
    template: "%s · District Roleplay",
  },
  description:
    "The official municipal forum for District Roleplay — city administration, public services, and community discussion.",
  icons: {
    icon: "/district-roleplay-logo.png",
    apple: "/district-roleplay-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col min-h-screen bg-cream antialiased">
        <ForumScrollPersistence />
        <ForumScrollRestore />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
