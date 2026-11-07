"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { themeConfig } from "@/theme/tokens";
import NightFx from "./NightFx";

dayjs.locale("vi");

type Mode = "light" | "dark";
const ThemeModeContext = createContext<{ mode: Mode; toggle: () => void }>({ mode: "dark", toggle: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

export default function Providers({ initialMode, children }: { initialMode: Mode; children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  const config = themeConfig(mode);
  const toggle = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    document.cookie = `lh_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = next;
  };
  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ConfigProvider locale={viVN} theme={{ ...config, token: { ...config.token, motion: !reducedMotion } }}>
        <App>
          <NightFx />
          {children}
        </App>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
