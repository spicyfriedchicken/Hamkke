import type { Metadata } from "next";
import "../globals.css";
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: "Hamkke",
  description: "Share, Achieve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <AuthProvider>
      {children}
    </AuthProvider>
      </body>
    </html>
  );
}
