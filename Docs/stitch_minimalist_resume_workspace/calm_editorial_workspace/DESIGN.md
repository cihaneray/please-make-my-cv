---
name: Calm Editorial Workspace
colors:
  surface: '#fbf8fc'
  surface-dim: '#dcd9dd'
  surface-bright: '#fbf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2f7'
  surface-container: '#f0edf1'
  surface-container-high: '#eae7eb'
  surface-container-highest: '#e4e1e6'
  on-surface: '#1b1b1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#303033'
  inverse-on-surface: '#f3f0f4'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#5d5e66'
  on-secondary: '#ffffff'
  secondary-container: '#e3e1ec'
  on-secondary-container: '#63646c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002109'
  on-tertiary-container: '#009842'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#fbf8fc'
  on-background: '#1b1b1e'
  surface-variant: '#e4e1e6'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: '0'
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is tailored for an intentional, distraction-free desktop application dedicated to career drafting, curriculum vitae composition, and resume engineering. Drawing architectural inspiration from linear workspaces, focused writing suites, and modern editorial tools, the interface operates as a quiet gallery frame rather than an assertive dashboard.

The aesthetic marries Swiss modernist precision with digital craft. Whitespace is active, deliberate, and structural. UI elements retreat to let content breathe, prioritizing visual serenity, typographic hierarchy, and precision layout fidelity. Interactions feel tactile yet featherlight, evoking the tactile calm of premium uncoated stationery paired with the snappy utility of high-end productivity software.

## Colors

The palette relies on subtle chromatic shifts between off-white surfaces, razor-thin delineation lines, and deep ink-rich typography.

### Core Architecture
- **Canvas Base Background:** `#FAFAFB` (Subtle warm off-white canvas that reduces eye strain during prolonged editing sessions).
- **Workspace Surfaces & Panels:** `#FFFFFF` (Pristine white for floating sheets, active input fields, and editing sidebars).
- **Preview & Inspection Backdrop:** `#F1F2F5` (Cool soft slate-grey providing a structural boundary for the rendered A4 canvas).
- **Borders & Dividers:** Primary structural hairline borders at `#E4E5E9`; secondary internal card dividers at `#EEEEF2`.

### Typography Colors
- **Text Primary:** `#18181B` (Deep ink zinc; authoritative and legible without the harshness of pure `#000000`).
- **Text Secondary:** `#71717A` (Muted neutral slate for labels, metadata, and unselected states).
- **Text Tertiary / Placeholder:** `#A1A1AA` (Subtle zinc for empty states, shortcuts, and helper hints).

### Functional & Semantic Accents
- **Primary Interactive:** `#0F172A` (Deep slate ink for primary action anchors and deep focus states).
- **Focus Ring:** `#0F172A` at 15% opacity with a 2px offset.
- **ATS Semantic Signals:**
  - *Optimal Match:* `#16A34A` (Refined olive emerald).
  - *Attention / Warning:* `#D97706` (Muted warm amber).
  - *Critical / Error:* `#DC2626` (Soft crimson).

## Typography

The type scale rejects oversized, boastful display typography in favor of an understated editorial micro-scale. Every size is optimized for continuous reading, dense resume data modeling, and precise interface alignment.

- **Typeface Selection:** Inter configured with standard tabular numbers and contextual alternates enabled (`cv05`, `cv11`).
- **Hierarchy Behavior:** Section headers never exceed 20px. Visual rank is articulated through font weight shifts (500 Medium vs 600 Semi-Bold) and foreground ink values rather than sheer size enlargement.
- **Micro-Labels & Meta:** 11px and 12px tags receive slight tracking (`0.01em` to `0.02em`) to maintain crisp optical separation against high-density document trees.

## Layout & Spacing

The workspace uses a multi-pane split layout designed primarily for fixed-viewport desktop environments:

1. **Sidebar Navigation (240px fixed):** Outlines sections, templates, and document collections.
2. **Editor Stage (Variable 420px–640px):** Form fields, contextual suggestions, and ATS evaluation matrices.
3. **Document Stage (Fluid remainder, min 600px):** Live preview displaying an authentic A4 canvas sheet centered on `#F1F2F5`.

### Spacing Philosophy
- Form inputs, lists, and toolbars run on a strict 4px base rhythm (`0.25rem`, `0.5rem`, `0.75rem`, `1rem`).
- Internal component paddings stay compact to maximize usable document space while canvas margins remain expansive to evoke an uncluttered desk.
- On smaller viewports (under 1024px), the layout reflows into a segmented switch between editor controls and document preview, retaining compact input densities.

## Elevation & Depth

Visual separation relies on sharp 1px structural outlines and delicate tonal shifts rather than heavy cast shadows. 

- **Level 0 (App Shell & Canvas Canvas):** Flat `#FAFAFB` and `#F1F2F5` backgrounds. No shadow.
- **Level 1 (Panels & Inputs):** Solid `#FFFFFF` grounded by a 1px border of `#E4E5E9`.
- **Level 2 (Dropdowns & Context Menus):** Pure `#FFFFFF` surface, 1px border of `#E4E5E9`, supported by an ambient drop: `0px 4px 12px -2px rgba(24, 24, 27, 0.06), 0px 2px 4px -1px rgba(24, 24, 27, 0.04)`.
- **The A4 Sheet Canvas:** Pure white `#FFFFFF` anchored on `#F1F2F5` using a realistic paper presentation shadow: `0px 1px 3px rgba(0, 0, 0, 0.05), 0px 12px 24px -4px rgba(15, 23, 42, 0.06)`. Border is a subtle hairline of `1px solid rgba(0, 0, 0, 0.04)`.

## Shapes

The design language uses tight, restrained corner curvature (Soft / Level 1) to convey precision and structural discipline.

- **Inputs, Buttons, and Menu Items:** 4px (`0.25rem`) border radius.
- **Panels, Flyouts, and Dialog Modals:** 8px (`0.5rem`) border radius.
- **Badges and Status Dots:** Pill-shaped or subtle 4px geometry.
- **A4 Document Canvas:** 2px subtle radius or razor-sharp 0px edge to simulate clean-cut paper stock.

## Components

### Buttons
- **Primary:** Filled `#0F172A`, text `#FFFFFF`, height 32px, horizontal padding 12px, font size 13px (medium). Subtle hover shift to `#1E293B`.
- **Secondary / Ghost:** Transparent background, 1px border `#E4E5E9`, text `#18181B`. On hover: surface transitions to `#FAFAFB` with border `#D4D4D8`.
- **Icon / Tertiary Actions:** Height 28px, width 28px, borderless. Text/icon color `#71717A`, shifting to `#18181B` with a `#F1F2F5` background on hover. Use 1.5px stroke icons (Lucide standard).

### Form Inputs & Text Areas
- Background `#FFFFFF`, border 1px `#E4E5E9`, font size 13px, height 34px (multiline inputs adapt organically).
- Focus state: border color `#0F172A`, zero layout shift, accented by a 2px outer ring `rgba(15, 23, 42, 0.08)`.
- Section titles inside the editor double as inline-editable typography without input chrome until hovered or focused.

### Document Outline & Lists
- Nested draggable list rows with a compact 28px item height.
- Drag handles and 3-dot overflow triggers (`#A1A1AA`) appear only on hover.
- Active selected section: highlighted with `#F1F2F5` surface and deep ink typography (`#18181B`).

### ATS Badges & Chips
- Compact height of 20px, font size 11px, weight 500, padding 6px.
- Minimal background wash paired with high-contrast text:
  - Success: `#F0FDF4` fill, `#16A34A` text, `#DCFCE7` border.
  - Warning: `#FFFBEB` fill, `#D97706` text, `#FEF3C7` border.
  - Neutral / Metric: `#F4F4F5` fill, `#52525B` text, `#E4E4E7` border.

### Context Menus & Popovers
- White `#FFFFFF` container with 6px internal padding.
- Menu items styled at 13px with 28px item height, rounded 4px, displaying keyboard shortcuts right-aligned in `#A1A1AA`.