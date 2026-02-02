import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeBlocking - Cloud IDE",
  description: "Cloud-native IDE for developers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
