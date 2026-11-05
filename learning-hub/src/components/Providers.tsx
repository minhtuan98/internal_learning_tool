"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { themeConfig } from "@/theme/tokens";

dayjs.locale("vi");

type Mode = "light" | "dark";
const ThemeModeContext = createContext<{ mode: Mode; toggle: () => void }>({ mode: "light", toggle: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

export default function Providers({ initialMode, children }: { initialMode: Mode; children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const toggle = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    document.cookie = `lh_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = next;
  };
  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ConfigProvider locale={viVN} theme={themeConfig(mode)}>
        <App>{children}</App>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
