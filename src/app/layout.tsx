import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Tikhov Med School",
  description: "Система учёта занятий онлайн-школы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
