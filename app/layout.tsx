import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  fallback: ["Century Gothic", "Calibri", "sans-serif"],
});

export const metadata: Metadata = {
  title: "SIMAP — Movimentação e Acompanhamento Patrimonial",
  description: "Sistema de Movimentação e Acompanhamento Patrimonial da Justiça Federal do Amapá",
  icons: {
    icon: "/favicon-simap.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
