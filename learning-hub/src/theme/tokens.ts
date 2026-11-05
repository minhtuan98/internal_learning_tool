import { theme, type ThemeConfig } from "antd";

/**
 * Ant Design theme tokens — single source shared with Figma.
 *
 * Figma: file "Learning Hub" (2DXccwpK15yRxR5dBHCajq), page "🧩 Design System · Ant Design",
 * variable collection "antd theme" (modes Light / Dark). Every Figma variable has the same name
 * as the antd token below and WEB code syntax `var(--ant-<token-kebab>)`, which is exactly the
 * CSS variable antd emits because `cssVar.prefix = "ant"` is set in `themeConfig`.
 *
 * Change a value here AND in the Figma variable (or ask Claude to sync both).
 */
export const palette = {
  light: {
    colorPrimary: "#214E91",
    colorPrimaryHover: "#3B6FBF",
    colorPrimaryActive: "#173B70",
    colorPrimaryBg: "#EAF1FC",
    colorPrimaryBorder: "#A9C1E8",
    colorText: "#17243A",
    colorTextSecondary: "#58677D",
    colorTextTertiary: "#718096",
    colorTextQuaternary: "#9AA6B8",
    colorTextLightSolid: "#FFFFFF",
    colorBorder: "#DCE3ED",
    colorBorderSecondary: "#E7ECF3",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F8FAFC",
    colorFillTertiary: "#F4F6F9",
    colorSuccess: "#206347",
    colorSuccessBg: "#EAF5EF",
    colorSuccessBorder: "#A8D5BC",
    colorWarning: "#83550B",
    colorWarningBg: "#FFF4DC",
    colorWarningBorder: "#F2D49B",
    colorError: "#B42318",
    colorErrorBg: "#FDECEA",
    colorErrorBorder: "#F5B5AE",
    colorInfo: "#214E91",
  },
  dark: {
    colorPrimary: "#7FA6E3",
    colorPrimaryHover: "#9DBCEB",
    colorPrimaryActive: "#5E87C9",
    colorPrimaryBg: "#1B2A44",
    colorPrimaryBorder: "#2F4A78",
    colorText: "#E6ECF5",
    colorTextSecondary: "#A9B6CA",
    colorTextTertiary: "#8494AD",
    colorTextQuaternary: "#5E6E88",
    colorTextLightSolid: "#FFFFFF",
    colorBorder: "#2A3A55",
    colorBorderSecondary: "#223049",
    colorBgContainer: "#152033",
    colorBgLayout: "#0E1522",
    colorFillTertiary: "#1A2740",
    colorSuccess: "#5CC08F",
    colorSuccessBg: "#12301F",
    colorSuccessBorder: "#24543A",
    colorWarning: "#E5B45A",
    colorWarningBg: "#33270F",
    colorWarningBorder: "#5A4519",
    colorError: "#F2867B",
    colorErrorBg: "#3A1714",
    colorErrorBorder: "#6B2A24",
    colorInfo: "#7FA6E3",
  },
};

/** Radius tokens = Figma variables borderRadius / borderRadiusSM / borderRadiusXS. */
export const radius = { borderRadius: 8, borderRadiusSM: 6, borderRadiusXS: 4, borderRadiusLG: 8 };

const shared = {
  fontFamily: "Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,
  fontSizeHeading2: 28,
  controlHeight: 32, // Figma Button / Input "medium" = 32, "large" = 40
  ...radius,
};

export function themeConfig(mode: "light" | "dark"): ThemeConfig {
  const p = palette[mode];
  return {
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { prefix: "ant", key: "learning-hub" },
    token: { ...shared, ...p },
    components: {
      Layout: { siderBg: p.colorBgContainer, headerBg: p.colorBgContainer, bodyBg: p.colorBgLayout, headerHeight: 72, headerPadding: "0 32px" },
      Menu: { itemBg: "transparent", itemSelectedBg: p.colorPrimaryBg, itemSelectedColor: p.colorPrimary, itemHeight: 44, itemBorderRadius: 8 },
      Table: { headerBg: p.colorFillTertiary, headerColor: p.colorTextSecondary, cellPaddingBlock: 14 },
      Card: { paddingLG: 24 },
      Tabs: { horizontalMargin: "0 0 20px 0" },
    },
  };
}

export const SIDER_WIDTH = 224;
