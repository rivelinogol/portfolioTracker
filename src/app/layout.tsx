import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartera",
  description: "Listado de posiciones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
