# Learning Hub — Design system (Ant Design 6)

Figma file: [Learning Hub](https://www.figma.com/design/2DXccwpK15yRxR5dBHCajq/Untitled?node-id=23-2) · page **🧩 Design System · Ant Design**
Code: `antd@6.7.0`, theme in [`src/theme/tokens.ts`](src/theme/tokens.ts), shared components in [`src/components/`](src/components/).

The Figma components are the Ant Design Open Source (Community) kit, copied into the file, reduced to the components this app uses, and restyled with the Learning Hub theme. They are **not** a published library (Code Connect needs an Organization plan), so each Figma component's description holds its code mapping instead.

## Tokens (Figma variables ⇄ code)

Figma collection **antd theme** (modes Light / Dark). Variable name = antd token name. WEB code syntax = `var(--ant-<token-kebab>)`, which is the CSS variable antd emits because `cssVar.prefix = "ant"`.

Palette = **Saigon Technology on Aurora** (2026-11-06): brand green #8DC63F, teal #03B0BC, blue #1E73BE (taken from saigontechnology.com); teal primary; deep blue-black dark. **Dark is the default mode**; the header toggle stores `lh_theme=light`.

| Token | Light | Dark |
|---|---|---|
| colorPrimary / Hover / Active | #0B7C86 / #0E95A0 / #08646C | #2CC5CF / #5AD5DC / #14A9B3 |
| colorPrimaryBg / Border | #E6F6F7 / #9ED9DE | #0D2A30 / #16525A |
| colorText / Secondary / Tertiary / Quaternary | #102030 / #4A5D70 / #687B8E / #98A8B8 | #E6EEF5 / #9FB1C2 / #7D90A3 / #52657A |
| colorBorder / BorderSecondary | #D8E2EA / #E6EDF2 | #1E2C3A / #172331 |
| colorBgContainer / BgElevated / BgLayout / FillTertiary | #FFFFFF / #FFFFFF / #F4F7FA / #EFF4F7 | #0C1520 / #121D2A / #060B12 / #122030 |
| colorSuccess / Bg / Border | #3F7D12 / #EEF7E4 / #BFE09A | #9BD45A / #16260A / #36541A |
| colorWarning / Bg / Border | #A15C07 / #FFF5E0 / #F5D598 | #FBBF24 / #2E2410 / #5A4519 |
| colorError / Bg / Border | #D0313F / #FDEEEF / #F5B7BC | #FB7185 / #3A1422 / #6B2338 |
| colorInfo | #1E73BE | #4FA3E8 |
| borderRadius / SM / XS / LG | 8 / 6 / 4 / 12 | same |

Contrast checked: primary text on white 4.95:1, white text on the button gradient ≥ 4.88:1, dark-mode primary on container 8.7:1.

Font: Inter (body, `--font-sans`) + Space Grotesk (h1–h3, Statistic numbers, wordmark; `--font-display`), both via `next/font` with the Vietnamese subset. Control height: 32 (medium), 40 (large), 24 (small).

Spacing scale (Figma FLOAT variables, same in both modes): `paddingXS/SM/–/LG/XL` = 8 / 12 / 16 / 24 / 32, `marginXS/SM/–/LG` = 8 / 12 / 16 / 24.

## Aurora AI (futuristic layer)

Effects sit on top of antd through CSS in [`src/app/globals.css`](src/app/globals.css); components stay plain antd. Figma: variables `aurora/*` + section "09 · Aurora AI" on the DS page.

| Effect | Rule | Where |
|---|---|---|
| Gradient | `--lh-grad` = 120° #8DC63F → #03B0BC (55%) → #1E73BE (brand). Buttons use `--lh-btn-grad` #0A7D88 → #0B6F9A → #1C5FA6 so white text passes 4.5:1 | Progress fill, KPI top hairline, particle colours, "Hub" in the wordmark; `--lh-btn-grad` on primary Button |
| Backdrop | 3 radial colour fields (green top-left, teal top-right, blue bottom) + 48 px grid faded from the top; fixed behind the app; drifts over 40 s | `body::before/after` |
| Glass | surface `--lh-glass-bg` (dark rgba(15,18,40,.62) / light rgba(255,255,255,.72)), blur 14–16 px, border `--lh-glass-border`, 1 px top highlight | every `Card`, admin Sider + Header (`.lh-glass`) |
| Glow | `--lh-glow` teal shadow; `--lh-glow-strong` on hover | primary Button, clickable card hover, brand tile |
| Gradient title | `--lh-title-grad` text → green → teal, clipped to text | `PageHeader` title, login title |
| Glow border | 1 px gradient ring (green → transparent → blue) | Sider note, login card, member "continue" hero (`.lh-hero`) |
| Menu selected | green→blue wash + 2 px green rail | admin Sider `Menu` |

Rules: one gradient element per area (the primary action), body text never gradient, success/warning/error keep their solid status colours (Tag, Progress status), all motion stops under `prefers-reduced-motion`.

## Night Glow (dark-mode layer, 2026-11-06)

Reference the team liked: genesisfxmarkets.com. Code: `src/app/night.css` (all rules scoped to `[data-theme="dark"]`; light mode keeps Aurora) + `src/components/NightFx.tsx`.

| Element | Look | Code |
|---|---|---|
| Canvas | near-black `#05070D`, one teal light from the top, no grid | `body::before` |
| Shell | no sider: logo · frosted pill nav (centre) · account; active item has a breathing glow (4s) | `TopBar` in `Shells.tsx`, `.ng-topbar`, `.ng-pillnav` |
| Titles | 40px, weight 500, metallic gradient (white → grey) | `--lh-title-grad` |
| Lit panels (KPI, titled cards, "continue learning", login) | mint beam on the top edge, light blooming above (6s breathe) and spilling inside | `.lh-kpi`, `.ant-card:has(> .ant-card-head)` |
| Primary button | light pill, teal outer ring, light core follows the pointer (`--lx`) | `NightFx` pointermove |
| Secondary button / tags | ghost pill / pill | `.ant-btn`, `.ant-tag` |
| Scroll reveal | panels below the fold rise in (20px, blur 6px → 0, 800ms) | `NightFx`, Web Animations API (no DOM attributes → no hydration mismatch) |

Accent = Saigon Technology teal `#03B0BC` + mint `#6FF3DF`. `prefers-reduced-motion`: glows static, no reveal.

## Certificates

Issued automatically, once per member per course, when the course is complete (all lessons + every published quiz passed). Code: `src/lib/certificates.ts`, `src/components/Certificate.tsx`.

- Completion rule: all lessons learned + every published quiz passed at **its own pass score** (`Quiz.passScore`, set per quiz in "Điểm đạt để nhận chứng chỉ").
- Number: `<seq in year>/GCN-<code>.<year>` (e.g. `22/GCN-IMS.2026`).
- Recipient name format (setting, `src/lib/cert-name.ts`): FULL "Đặng Quốc Bảo" · ASCII "Dang Quoc Bao" · EMAIL account name. No full name → account name (admin sees a warning).
- Admin checks each member's certificate with **Xem trước** (issued ones as issued + preview with current settings) and can **Sửa tên** on an issued certificate (number and date unchanged).
- Text is snapshotted at issue time (name, course, signer, seal), so an issued certificate never changes.
- Admin → **Chứng chỉ**: KPIs, per-member table, all certificates, rate per course, **Cài đặt chứng chỉ** (signer, title, code, seal text, live preview).
- Member → **Chứng chỉ**: own certificates; course page and quiz result link to the new certificate.
- `/certificates/[id]`: full sheet (owner or admin only), **In / Lưu PDF** prints one A4 landscape page.
- The sheet is a CSS size container (`cqw` units), so thumbnails, page and print share one layout.

## Quiz integrity (anti-cheat, decided 2026-11-06)

Code: `src/lib/integrity.ts`, `reportViolation` / `attemptHeartbeat` in `src/server/member-actions.ts`, `TakeQuizClient.tsx`, admin **Kết quả → Giám sát thi** (`IntegrityPanel.tsx`).

| Rule | Behaviour |
|---|---|
| Shuffle | Each attempt stores its own question order and option order (`Attempt.questionOrder`, `optionOrders`). The browser sends the slot it showed; the server stores the original index. |
| Violations | Tab hidden / minimised (from 0.2 s), another app or window focused (from 1 s), closing / reloading / leaving the quiz page and coming back after ≥ 3 s (`LEFT_PAGE`, server-side: beacon on `pagehide` + 10 s heartbeat), copy/cut, right-click, Ctrl/Cmd+P / print, Print Screen, DevTools keys (F12, Ctrl/Cmd+Shift/Option+I/J/C, Ctrl/Cmd+U). Each one is logged (`AttemptEvent`) with a warning "Vi phạm x / N". |
| One at a time | From detection until the member presses "Tôi đã hiểu, làm tiếp" nothing else is counted; leaving the quiz meanwhile is still logged as a signal (`violation = false`) for admins. The warning closes only with that button. The pending warning is kept on the server (`Attempt.warningPending`): a reload or reopen shows it again, and the server itself refuses to count while it is pending. |
| Never lost | A violation that cannot reach the server is retried (0 s, 1 s, 3 s) and then re-sent with the next heartbeat; detection is never switched off by an error. |
| Rules shown | The list of what counts (`src/lib/integrity-rules.ts`) is shown on the quiz intro, beside the questions while taking the quiz, and in every warning. |
| Threshold | N = admin setting `quiz.maxViolations` (default 3, 0–20), global for all courses, counted per attempt. Violation N+1 voids the attempt: 0 points, not passed, the attempt stays used. |
| Review | Per-question right/wrong is hidden until an admin switches on "Thành viên xem đúng/sai từng câu" on the quiz (`Quiz.reviewReleased`). |
| Watermark | Name · employee code · time, repeated diagonally over the quiz; no text selection. |
| Flags (admin only, never block) | Several tabs/devices on one attempt, same network at the same time, under 5 s per question, identical answers to another member. |

Not possible in a browser: blocking screenshots taken with another device. The watermark and shuffling make a leaked picture traceable and less useful.

## Brand (Saigon Technology)

- Constants in [`src/lib/brand.ts`](src/lib/brand.ts): company name, tagline "Your success is our mission", brand colours, and the "S" mark paths (from the company's logo SVG; white strokes = ink, green strokes = #8DC63F). Favicon = [`src/app/icon.svg`](src/app/icon.svg).
- **Particle logo** — [`ParticleLogo`](src/components/ParticleLogo.tsx), Canvas 2D, own implementation of the "particle sequence" idea (reference: effect-labs.com generator-particles):
  - particles cycle through steps: 3D sphere (spins) → S mark → words; each morph runs left→right with a stagger, colours blend to the next step;
  - spring physics (stiffness 0.045, damping 0.82) and pointer repulsion (radius per use);
  - ink = #F2F8FB on dark, #102030 on light;
  - pauses off screen / hidden tab; `prefers-reduced-motion` draws the S mark once with no animation.

| Where | Size | Steps | Particles |
|---|---|---|---|
| Sider / member header logo | 28×38 | mark | 260, repel 16 |
| Login card | 220×150 | sphere → mark | 900, repel 50 |
| Welcome hero | 820×260 | sphere → mark → "SAIGON TECHNOLOGY" → "LEARNING HUB" | 2200, repel 90 |

## Density: compact

Figma: section **08 · Density · Motion · Loading** (node 51:21378). Component tokens are Figma variables named `<Component>/<token>`, WEB syntax `var(--ant-<component>-<token>)`.

| Element | Before | Compact | Token |
|---|---|---|---|
| Header | 72–80 | 56 | `Layout/headerHeight` |
| Menu item (sider + horizontal) | 44 | 36 | `Menu/itemHeight` |
| Table row | ≈ 54 | ≈ 42 (padding 10 / 12) | `Table/cellPaddingBlock`, `Table/cellPaddingInline` |
| Card body / head | 24 / 56 | 20 / 48 | `Card/bodyPadding`, `Card/headerHeight` |
| Admin content padding | 32 / 40 | 24 / 32 | `paddingLG`, `paddingXL` |
| Gap between page blocks, PageHeader → content | 20–28 | 16 | `margin` |
| Sider padding / gap | 20·16 / 24 | 16·12 / 16 | `padding`, `paddingSM` |
| `Button size="large"` | many screens | login only | `controlHeightLG` |

Rules: keep font size 14 and a 32px minimum target; use `Row gutter={16}` and `Flex gap={16}` between blocks; never hard-code a gap above 24 inside a page.

## Motion: subtle

| When | Effect | Duration · easing | Code |
|---|---|---|---|
| Every navigation | fade in + slide up 4px | 200ms · ease-out | `admin/template.tsx`, `learn/template.tsx` → `.lh-page` |
| Lists of cards / KPIs | staggered fade in, 40ms per item, max 6 | 200ms · ease-out | `.lh-stagger > *` |
| Clickable card (KPI, course) | lift 2px + soft shadow | 200ms | `.lh-clickable:hover` |
| Button hover/press, Tag colour | antd default | 100ms | `motionDurationFast` |
| Dropdown, Tabs, Segmented | antd default | 200ms | `motionDurationMid` |
| Drawer, Modal, Progress | antd default | 250ms | `motionDurationSlow` |
| Stat figures (KPI, Statistic, welcome stats, BarList, StackedBar) | count up 0 → value on first view, old → new on change | 800ms · ease-out cubic | `CountUp` / `countUpFormatter` in `components/ui.tsx` |
| `prefers-reduced-motion: reduce` | no animation | 0 | `globals.css` media query |

Only opacity and translate ≤ 4px. No bounce, no scale on page content.

## Loading

- Every route segment has a `loading.tsx` that renders `PageSkeleton` (from `@/components/ui`) with the layout of the target page: `variant="list"` (header + KPI row + table), `"detail"` (header + tabs + body/side), `"cards"` (member lists), `"dashboard"` (filters + 4 KPI + 2 charts).
- `Skeleton` is active (shimmer) and uses antd tokens, so it follows light/dark.
- Submitting: `Button loading`. AI and transcript: `Spin` with text ("Đang tạo câu hỏi…", "Đang lấy transcript…").

## Components (Figma ⇄ code)

| Figma component (node) | Code | Used in |
|---|---|---|
| Button (22:24937) | `Button` | all actions |
| Text/Text, Text/Title (22:32758, 22:32803) | `Typography.Text/Title` (`Text`, `Title` from `@/components/ui`) | text, page titles |
| Divider (22:34474) | `Divider` | login, editor toolbar |
| Menu, Inline-Menu-Item/1st-Level, Horizontal-Submenu-Item/1st-Level | `Menu` inline / horizontal | `Shells.tsx` |
| Breadcrumb (22:36954) | `Breadcrumb` | `PageHeader` |
| Dropdown-Menu (22:37436) | `Dropdown` | row menus, account menu |
| Pagination (25:52965) | `Table pagination` | tables |
| Tabs/Top (26:143574) | `Tabs` | course, quiz, results |
| Segmented-Group (26:134406) | `Segmented` | review filter, assignment filter |
| Input, Search-Box, Textarea (25:85833, 25:86014, 25:86403) | `Input`, `Input.Search`, `Input.TextArea` | forms, lists |
| Input-Number (25:84455) | `InputNumber` | quiz settings |
| Select (25:93070) | `Select` | filters, pickers |
| Date-Picker (25:63671) | `DatePicker`, `RangePicker` | deadline, quiz window |
| Checkbox, Radio, Radio-Button-Group | `Checkbox`, `Radio`, `Radio.Group optionType="button"` | access, answers, role |
| Upload (25:108682) | `Upload` | `CoverUpload` |
| Vertical-Form-Item/Input, /Select | `Form layout="vertical"` + `Form.Item` | drawers, modals |
| Avatar, Tag, Card, Statistic | `Avatar`, `Tag`, `Card`, `Statistic` | lists, status tags, `KpiCard` |
| Descriptions, Empty, Tooltip | `Descriptions`, `Empty`, `Tooltip` | quiz summary, empty states |
| Alert, Drawer, Message, Popconfirm | `Alert`, `Drawer`, `App.useApp().message`, `Popconfirm` | feedback |
| Progress, Result, Skeleton | `Progress`, `Result`, `Skeleton` | progress, 403/404, loading |

Status tag colors: Figma `Tag Color=green / gold / red / blue / default` ⇄ code `Tag color="success" / "warning" / "error" / "processing" / default`.

## Screens

All screens on page "Page 1" use instances of these components for buttons, status tags, text inputs and selects (swapped on 6 Nov 2026). Inputs with a search or calendar icon are still drawn by hand.

Compact redraw (6 Nov 2026): every screen on "Page 1" follows the Density table above — `Top bar` 56 (bound to `Layout/headerHeight`), `Navigation item` 36 (`Menu/itemHeight`), `Data row` padding 10/12 (`Table/cellPadding*`), cards 20 (`Card/bodyPadding`), `Page content` padding 24/32 with block gap 16 (`margin`). Member "Khóa học của tôi" cards are 3 per row with a 16:9 cover.

Welcome (`/welcome`, 2026-11-06): shown after every sign-in (dev quick sign-in and Google) unless the user ticks "Không hiện màn này…" (cookie `lh_skip_welcome=1`); reopen from the avatar menu → "Màn chào mừng". Content, top to bottom:
- top bar: company + product, theme toggle;
- particle logo hero, tagline tag, title "Chào <tên>, chào mừng đến Learning Hub", one line describing the role;
- 4 stat cards — admin: published courses, active members, 30-day completion, overdue members; member: assigned, in progress, completed, overdue;
- one primary button to the role home ("Vào trang Tổng quan" / "Vào Việc của tôi"; Enter does the same) + "Học tiếp: <khóa gần hạn nhất>" for members;
- the opt-out checkbox.

Shell layout (Figma ⇄ code):
- Admin header = `Breadcrumb` on the left ("Không gian học tập / <menu item>" by default, or the page's own crumbs) + theme button + avatar on the right. In code `PageHeader crumbs` is sent to the header through `HeaderCrumbsProvider`; it is not repeated above the title.
- Member header = logo + horizontal `Menu` + theme button + avatar; member pages keep their breadcrumb above the title.

## Known gaps
- Welcome screen: in Figma only as a capture of the coded screen (frame "Welcome" on Page 1), not rebuilt from components.
- Aurora AI: Figma Page 1 screens pick up the new colours through variables, but gradient fills, glass blur and glow are only drawn in DS section "09 · Aurora AI", not on every screen.

- Figma icons are Lucide (section "07 · Icons (Lucide)"); code uses `@ant-design/icons`.
- The kit has no Table or Modal component in this file (not copied); screens draw tables by hand.
- Nested icons inside some kit components still point to the original community file.
- `StackedBar` (AI question quality) is drawn with divs because antd has no stacked bar; `BarList` uses antd `Progress`. Switch both to `@ant-design/charts` if richer charts are needed.
- Figma headers show a "Tiếng Việt · VI" language button; the app is Vietnamese-only, so code has no language switch yet.
- Figma "Danh sách khóa học" shows a Bảng / Lưới view switch and a status filter; code uses status tabs only.
