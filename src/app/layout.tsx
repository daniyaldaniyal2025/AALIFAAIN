import type { Metadata } from "next";
import { Playfair_Display, Inter, Noto_Sans_Arabic, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const amiri = Amiri({
  variable: "--font-arabic-serif",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Alifaain - Premium Beauty & Skincare",
  description: "Discover authentic Moroccan beauty traditions and innovative Korean skincare at Alifaain. Your destination for premium beauty products.",
  keywords: ["Alifaain", "beauty", "skincare", "Morocco", "Korea", "premium"],
  icons: {
    icon: "/alifaain-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} ${notoArabic.variable} ${amiri.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
