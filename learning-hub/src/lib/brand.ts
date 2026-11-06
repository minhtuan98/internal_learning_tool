/**
 * Company brand (Saigon Technology). Server-safe constants only.
 * Logo artwork: the "S" mark from saigontechnology.com/wp-content/uploads/2024/09/logo-1.svg
 * (viewBox 0 0 33.95 48). "ink" paths are white on dark / near-black on light; "accent" is brand green.
 */
export const BRAND = {
  company: "Saigon Technology",
  tagline: "Your success is our mission",
  green: "#8DC63F",
  teal: "#03B0BC",
  blue: "#1E73BE",
} as const;

export const ST_MARK = {
  width: 33.95,
  height: 48,
  ink: "M16.975,0 L16.975,5.64705882 L5.65833333,16.9411765 L0,16.9411765 L16.975,0 Z M33.95,31.0588235 L16.975,48 L16.975,42.3529412 L28.2916667,31.0588235 L33.95,31.0588235 Z",
  accent:
    "M16.975,14.1176471 L33.95,31.0588235 L28.2916667,31.0588235 L16.975,19.7647059 L16.975,14.1176471 Z M0,16.9411765 L5.65833333,16.9411765 L16.975,28.2352941 L16.975,33.8823529 L0,16.9411765 Z",
} as const;
