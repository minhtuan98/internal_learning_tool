import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "@/components/Providers";
import "./globals.css";
import "./night.css"; // "Night Glow" layer for dark mode (DESIGN_SYSTEM.md → Night Glow)

// Body text = Inter, headings + numbers = Space Grotesk (DESIGN_SYSTEM.md → Aurora AI → Type).
const sans = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin", "vietnamese"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Learning Hub",
  description: "Nền tảng học tập nội bộ",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Dark is the default look (Aurora AI); the toggle stores "light" in the lh_theme cookie.
  const mode = (await cookies()).get("lh_theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="vi" data-theme={mode} className={`${sans.variable} ${display.variable}`}>
      <body>
        <AntdRegistry>
          <Providers initialMode={mode}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
