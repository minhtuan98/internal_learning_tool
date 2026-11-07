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
  // Saigon Technology brand on the Aurora layout (DESIGN_SYSTEM.md → Tokens): teal primary, brand green
  // #8DC63F + teal #03B0BC + blue #1E73BE in the gradient, deep blue-black dark mode.
  light: {
    colorPrimary: "#0B7C86",
    colorPrimaryHover: "#0E95A0",
    colorPrimaryActive: "#08646C",
    colorPrimaryBg: "#E6F6F7",
    colorPrimaryBorder: "#9ED9DE",
    colorText: "#102030",
    colorTextSecondary: "#4A5D70",
    colorTextTertiary: "#687B8E",
    colorTextQuaternary: "#98A8B8",
    colorTextLightSolid: "#FFFFFF",
    colorBorder: "#D8E2EA",
    colorBorderSecondary: "#E6EDF2",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorBgLayout: "#F4F7FA",
    colorFillTertiary: "#EFF4F7",
    colorSuccess: "#3F7D12",
    colorSuccessBg: "#EEF7E4",
    colorSuccessBorder: "#BFE09A",
    colorWarning: "#A15C07",
    colorWarningBg: "#FFF5E0",
    colorWarningBorder: "#F5D598",
    colorError: "#D0313F",
    colorErrorBg: "#FDEEEF",
    colorErrorBorder: "#F5B7BC",
    colorInfo: "#1E73BE",
  },
  dark: {
    colorPrimary: "#2CC5CF",
    colorPrimaryHover: "#5AD5DC",
    colorPrimaryActive: "#14A9B3",
    colorPrimaryBg: "#0D2A30",
    colorPrimaryBorder: "#16525A",
    colorText: "#E8ECF5",
    colorTextSecondary: "#A0A7B4",
    colorTextTertiary: "#7C8492",
    colorTextQuaternary: "#4E5562",
    colorTextLightSolid: "#FFFFFF",
    colorBorder: "#262B34",
    colorBorderSecondary: "#171B22",
    colorBgContainer: "#0A0D14",
    colorBgElevated: "#10141C",
    colorBgLayout: "#05070D",
    colorFillTertiary: "#12161D",
    colorSuccess: "#9BD45A",
    colorSuccessBg: "#16260A",
    colorSuccessBorder: "#36541A",
    colorWarning: "#FBBF24",
    colorWarningBg: "#2E2410",
    colorWarningBorder: "#5A4519",
    colorError: "#FB7185",
    colorErrorBg: "#3A1422",
    colorErrorBorder: "#6B2338",
    colorInfo: "#4FA3E8",
  },
};

/**
 * Aurora effect colours (not antd tokens; emitted as --lh-* CSS variables in globals.css).
 * Figma: variables "aurora/*" in collection "antd theme".
 */
export const aurora = {
  gradientFrom: "#8DC63F", // Saigon Technology green
  gradientVia: "#03B0BC", // teal
  gradientTo: "#1E73BE", // blue
};

/** Radius tokens = Figma variables borderRadius / borderRadiusSM / borderRadiusXS. */
export const radius = { borderRadius: 8, borderRadiusSM: 6, borderRadiusXS: 4, borderRadiusLG: 12 };

const shared = {
  fontFamily: "var(--font-sans), Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,
  fontSizeHeading2: 28,
  controlHeight: 32, // Figma Button / Input "medium" = 32, "large" = 40
  controlHeightSM: 24,
  controlHeightLG: 40,
  // Spacing scale = Figma variables padding* / margin* (compact: block gap 16)
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  paddingLG: 24,
  paddingXL: 32,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  marginLG: 24,
  // Motion = Figma variables motionDuration* (ms there, seconds here). Subtle: 100 / 200 / 250.
  motionDurationFast: "0.1s",
  motionDurationMid: "0.2s",
  motionDurationSlow: "0.25s",
  ...radius,
};

/** Compact density = Figma variables `<Component>/<token>` in section "08 · Density · Motion · Loading". */
export const density = {
  headerHeight: 56,
  menuItemHeight: 36,
  tableCellPaddingBlock: 10,
  tableCellPaddingInline: 12,
  cardBodyPadding: 20,
  cardHeaderHeight: 48,
};

export function themeConfig(mode: "light" | "dark"): ThemeConfig {
  const p = palette[mode];
  return {
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    // Separate scopes prevent SSR dark variables from overriding a client-side light switch.
    cssVar: { prefix: "ant", key: `learning-hub-${mode}` },
    token: { ...shared, ...p },
    components: {
      // Layout surfaces are transparent so the aurora backdrop on <body> shows through; .lh-glass adds blur.
      Layout: { siderBg: "transparent", headerBg: "transparent", bodyBg: "transparent", headerHeight: density.headerHeight, headerPadding: "0 24px" },
      Menu: {
        itemBg: "transparent",
        itemSelectedBg: p.colorPrimaryBg,
        itemSelectedColor: p.colorPrimary,
        itemHeight: density.menuItemHeight,
        itemMarginBlock: 2,
        itemBorderRadius: 6,
        horizontalLineHeight: `${density.headerHeight - 2}px`,
      },
      Table: {
        colorBgContainer: "transparent", // sits on a glass Card
        headerBg: mode === "dark" ? "rgba(44,197,207,0.06)" : "rgba(11,124,134,0.04)",
        rowHoverBg: mode === "dark" ? "rgba(44,197,207,0.08)" : "rgba(11,124,134,0.05)",
        headerColor: p.colorTextSecondary,
        cellPaddingBlock: density.tableCellPaddingBlock,
        cellPaddingInline: density.tableCellPaddingInline,
      },
      Card: { bodyPadding: density.cardBodyPadding, headerHeight: density.cardHeaderHeight },
      Statistic: { contentFontSize: 28 },
      Tabs: { horizontalMargin: "0 0 16px 0" },
      Descriptions: { itemPaddingBottom: 8 },
    },
  };
}

export const SIDER_WIDTH = 224;
