module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        textSecondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        textMuted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        // Custom name aliases:
        'opti-cyan': '#06b6d4',
        'opti-navy': '#090d16',
        'opti-slate': '#111827',
      }
    },
  },
  plugins: [],
}
