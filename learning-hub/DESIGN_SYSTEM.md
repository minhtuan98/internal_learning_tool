# Learning Hub — Design system (Ant Design 6)

Figma file: [Learning Hub](https://www.figma.com/design/2DXccwpK15yRxR5dBHCajq/Untitled?node-id=23-2) · page **🧩 Design System · Ant Design**
Code: `antd@6.7.0`, theme in [`src/theme/tokens.ts`](src/theme/tokens.ts), shared components in [`src/components/`](src/components/).

The Figma components are the Ant Design Open Source (Community) kit, copied into the file, reduced to the components this app uses, and restyled with the Learning Hub theme. They are **not** a published library (Code Connect needs an Organization plan), so each Figma component's description holds its code mapping instead.

## Tokens (Figma variables ⇄ code)

Figma collection **antd theme** (modes Light / Dark). Variable name = antd token name. WEB code syntax = `var(--ant-<token-kebab>)`, which is the CSS variable antd emits because `cssVar.prefix = "ant"`.

| Token | Light | Dark |
|---|---|---|
| colorPrimary / Hover / Active | #214E91 / #3B6FBF / #173B70 | #7FA6E3 / #9DBCEB / #5E87C9 |
| colorPrimaryBg / Border | #EAF1FC / #A9C1E8 | #1B2A44 / #2F4A78 |
| colorText / Secondary / Tertiary / Quaternary | #17243A / #58677D / #718096 / #9AA6B8 | #E6ECF5 / #A9B6CA / #8494AD / #5E6E88 |
| colorBorder / BorderSecondary | #DCE3ED / #E7ECF3 | #2A3A55 / #223049 |
| colorBgContainer / BgLayout / FillTertiary | #FFFFFF / #F8FAFC / #F4F6F9 | #152033 / #0E1522 / #1A2740 |
| colorSuccess / Bg / Border | #206347 / #EAF5EF / #A8D5BC | #5CC08F / #12301F / #24543A |
| colorWarning / Bg / Border | #83550B / #FFF4DC / #F2D49B | #E5B45A / #33270F / #5A4519 |
| colorError / Bg / Border | #B42318 / #FDECEA / #F5B5AE | #F2867B / #3A1714 / #6B2A24 |
| borderRadius / SM / XS | 8 / 6 / 4 | same |

Font: Inter. Control height: 32 (medium), 40 (large), 24 (small).

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

## Known gaps

- Figma icons are Lucide (section "07 · Icons (Lucide)"); code uses `@ant-design/icons`.
- The kit has no Table or Modal component in this file (not copied); screens draw tables by hand.
- Nested icons inside some kit components still point to the original community file.
