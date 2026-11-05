import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Hub",
  description: "Nền tảng học tập nội bộ",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = (await cookies()).get("lh_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="vi" data-theme={mode}>
      <body>
        <AntdRegistry>
          <Providers initialMode={mode}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
