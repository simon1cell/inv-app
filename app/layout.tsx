import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

type RootFontVariables = CSSProperties & {
  "--font-sans": string;
};

const rootFontVariables: RootFontVariables = {
  "--font-sans":
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const metadata: Metadata = {
  title: "1Cell.AI · Inventory Tracking",
  description: "Inventory tracking dashboard for 1Cell.AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" style={rootFontVariables}>
      <body style={{ fontFamily: "var(--font-sans)" }}>
        {children}
      </body>
    </html>
  );
}
