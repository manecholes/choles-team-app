import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Choles Team App",
  description: "Juntos, somos Choles Team. Plataforma de gestion deportiva.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
