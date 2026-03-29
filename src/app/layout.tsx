import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { DateProvider } from "@/contexts/DateContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dash Tráfego — Performance Dashboard",
  description: "Dashboard de performance de mídia paga para agências e clientes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <DateProvider>{children}</DateProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
