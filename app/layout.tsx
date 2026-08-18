import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Santinho Digital",
  description:
    "Coloque sua foto na arte de campanha do seu candidato e compartilhe no WhatsApp, Instagram e Facebook.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Archivo:wght@500;600;700&display=swap"
        />
      </head>
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
