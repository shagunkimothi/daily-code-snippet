/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-secondary": "var(--bg-secondary)",
        card: "var(--card)",
        "card-hover": "var(--card-hover)",
        "card-elevated": "var(--card-elevated)",

        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        muted: "var(--muted)",

        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-dim": "var(--primary-dim)",
        "primary-subtle": "var(--primary-subtle)",
        "primary-glow": "var(--primary-glow)",
        "primary-glow-lg": "var(--primary-glow-lg)",

        accent: "var(--accent)",
        "accent-subtle": "var(--accent-subtle)",

        green: "var(--green)",
        "green-subtle": "var(--green-subtle)",
        amber: "var(--amber)",
        "amber-subtle": "var(--amber-subtle)",
        red: "var(--red)",
        "red-subtle": "var(--red-subtle)",

        border: "var(--border)",
        "border-hover": "var(--border-hover)",
        "border-card": "var(--border-card)",

        "sidebar-bg": "var(--sidebar-bg)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-text": "var(--sidebar-text)",
        "sidebar-hover": "var(--sidebar-hover)",

        "input-bg": "var(--input-bg)",
        "code-bg": "var(--code-bg)",
        "code-border": "var(--code-border)",

        "add-bg": "var(--add-bg)",
        "add-border": "var(--add-border)",
        "add-hover": "var(--add-hover)",

        scrollbar: "var(--scrollbar)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        primary: "var(--shadow-primary)",
        "cyan-lg": "var(--shadow-cyan-lg)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: 0, transform: "translateX(-8px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 6px var(--primary-glow)" },
          "50%": { boxShadow: "0 0 18px var(--primary-glow-lg)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
        slideIn: "slideIn 0.3s ease both",
        shimmer: "shimmer 1.6s infinite",
        pulseGlow: "pulseGlow 3s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
