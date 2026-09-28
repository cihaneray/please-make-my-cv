import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-dim": "rgb(var(--color-surface-dim) / <alpha-value>)",
        "surface-bright": "rgb(var(--color-surface-bright) / <alpha-value>)",
        "surface-container-lowest":
          "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
        "surface-container-low":
          "rgb(var(--color-surface-container-low) / <alpha-value>)",
        "surface-container":
          "rgb(var(--color-surface-container) / <alpha-value>)",
        "surface-container-high":
          "rgb(var(--color-surface-container-high) / <alpha-value>)",
        "surface-container-highest":
          "rgb(var(--color-surface-container-highest) / <alpha-value>)",
        "on-surface": "rgb(var(--color-on-surface) / <alpha-value>)",
        "on-surface-variant":
          "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        "inverse-surface": "rgb(var(--color-inverse-surface) / <alpha-value>)",
        "inverse-on-surface":
          "rgb(var(--color-inverse-on-surface) / <alpha-value>)",
        outline: "rgb(var(--color-outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--color-outline-variant) / <alpha-value>)",
        "surface-tint": "rgb(var(--color-surface-tint) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
        "primary-container":
          "rgb(var(--color-primary-container) / <alpha-value>)",
        "on-primary-container":
          "rgb(var(--color-on-primary-container) / <alpha-value>)",
        "inverse-primary": "rgb(var(--color-inverse-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        "on-secondary": "rgb(var(--color-on-secondary) / <alpha-value>)",
        "secondary-container":
          "rgb(var(--color-secondary-container) / <alpha-value>)",
        "on-secondary-container":
          "rgb(var(--color-on-secondary-container) / <alpha-value>)",
        tertiary: "rgb(var(--color-tertiary) / <alpha-value>)",
        "on-tertiary": "rgb(var(--color-on-tertiary) / <alpha-value>)",
        "tertiary-container":
          "rgb(var(--color-tertiary-container) / <alpha-value>)",
        "on-tertiary-container":
          "rgb(var(--color-on-tertiary-container) / <alpha-value>)",
        "tertiary-fixed": "rgb(var(--color-tertiary-fixed) / <alpha-value>)",
        "tertiary-fixed-dim":
          "rgb(var(--color-tertiary-fixed-dim) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        "on-error": "rgb(var(--color-on-error) / <alpha-value>)",
        "error-container": "rgb(var(--color-error-container) / <alpha-value>)",
        "on-error-container":
          "rgb(var(--color-on-error-container) / <alpha-value>)",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "1rem",
        "gutter-desktop": "1.5rem",
        margin: "1rem",
        "margin-desktop": "2rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "space-lg": "1rem",
        "space-xl": "1.5rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "headline-xl": [
          "20px",
          { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "headline-lg": [
          "16px",
          { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "headline-md": [
          "14px",
          { lineHeight: "20px", letterSpacing: "-0.005em", fontWeight: "600" },
        ],
        "body-lg": [
          "14px",
          { lineHeight: "22px", letterSpacing: "0", fontWeight: "400" },
        ],
        "body-md": [
          "13px",
          { lineHeight: "20px", letterSpacing: "0", fontWeight: "400" },
        ],
        "body-sm": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0", fontWeight: "400" },
        ],
        "label-lg": [
          "13px",
          { lineHeight: "18px", letterSpacing: "0", fontWeight: "500" },
        ],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" },
        ],
        "label-sm": [
          "11px",
          { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "500" },
        ],
      },
    },
  },
  plugins: [],
};

export default config;
