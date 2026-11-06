import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "var(--cf-color-canvas)",
        surface: "var(--cf-color-surface)",
        "surface-muted": "var(--cf-color-surface-muted)",
        ink: "var(--cf-color-ink)",
        "ink-muted": "var(--cf-color-ink-muted)",
        "strong-border": "var(--cf-color-border)",
        action: "var(--cf-color-action)",
        "action-hover": "var(--cf-color-action-hover)",
        accent: "var(--cf-color-accent)",
        "accent-ink": "var(--cf-color-accent-ink)",
        success: "var(--cf-color-success)",
        "success-surface": "var(--cf-color-success-surface)",
        warning: "var(--cf-color-warning)",
        "warning-surface": "var(--cf-color-warning-surface)",
        danger: "var(--cf-color-danger)",
        "danger-surface": "var(--cf-color-danger-surface)",
        disabled: "var(--cf-color-disabled)",
        "disabled-ink": "var(--cf-color-disabled-ink)",
        focus: "var(--cf-color-focus)",
        overlay: "var(--cf-color-overlay)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "cf-xs": ["var(--cf-font-size-xs)", { lineHeight: "var(--cf-line-height-body)" }],
        "cf-sm": ["var(--cf-font-size-sm)", { lineHeight: "var(--cf-line-height-body)" }],
        "cf-md": ["var(--cf-font-size-md)", { lineHeight: "var(--cf-line-height-body)" }],
        "cf-lg": ["var(--cf-font-size-lg)", { lineHeight: "var(--cf-line-height-tight)" }],
        "cf-xl": ["var(--cf-font-size-xl)", { lineHeight: "var(--cf-line-height-tight)" }],
        "cf-2xl": ["var(--cf-font-size-2xl)", { lineHeight: "var(--cf-line-height-tight)" }],
      },
      spacing: {
        "cf-1": "var(--cf-space-1)",
        "cf-2": "var(--cf-space-2)",
        "cf-3": "var(--cf-space-3)",
        "cf-4": "var(--cf-space-4)",
        "cf-6": "var(--cf-space-6)",
        "cf-8": "var(--cf-space-8)",
      },
      borderWidth: {
        DEFAULT: "var(--cf-border-width)",
        3: "var(--cf-border-width-strong)",
      },
      borderRadius: {
        "cf-sm": "var(--cf-radius-sm)",
        "cf-md": "var(--cf-radius-md)",
      },
      boxShadow: {
        brutal: "var(--cf-shadow-offset)",
        "brutal-sm": "var(--cf-shadow-offset-small)",
        focus: "var(--cf-focus-ring)",
      },
      transitionDuration: {
        fast: "var(--cf-motion-fast)",
      },
    },
  },
  plugins: [],
};
export default config;
