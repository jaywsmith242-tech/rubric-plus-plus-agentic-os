/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // RUBRIC++ design tokens (hex-valued CSS custom properties, alpha via <alpha-value>)
        void: {
          950: "rgb(var(--void-950) / <alpha-value>)",
          900: "rgb(var(--void-900) / <alpha-value>)",
        },
        raise: {
          800: "rgb(var(--raise-800) / <alpha-value>)",
          700: "rgb(var(--raise-700) / <alpha-value>)",
        },
        violet: {
          500: "rgb(var(--violet-500) / <alpha-value>)",
          400: "rgb(var(--violet-400) / <alpha-value>)",
        },
        peri: {
          400: "rgb(var(--peri-400) / <alpha-value>)",
          300: "rgb(var(--peri-300) / <alpha-value>)",
        },
        lav: {
          200: "rgb(var(--lav-200) / <alpha-value>)",
        },
        core: {
          "050": "rgb(var(--core-050) / <alpha-value>)",
        },
        hi: "rgb(var(--text-hi) / <alpha-value>)",
        lo: "rgb(var(--text-lo) / <alpha-value>)",
        ember: {
          400: "rgb(var(--ember-400) / <alpha-value>)",
          500: "rgb(var(--ember-500) / <alpha-value>)",
        },
        iron: {
          600: "rgb(var(--iron-600) / <alpha-value>)",
        },
        ok: "rgb(var(--ok) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        // shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // radius scale: 10 / 16 / 24 only
        sm: "10px",
        md: "10px",
        lg: "16px",
        xl: "24px",
        "2xl": "24px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
        serif: ["'Instrument Serif'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        hover: "cubic-bezier(.2,.8,.2,1)",
        expo: "cubic-bezier(.16,1,.3,1)",
        state: "cubic-bezier(.65,0,.35,1)",
        boot: "cubic-bezier(.23,1,.32,1)",
      },
      transitionDuration: {
        hover: "120ms",
        press: "90ms",
        panel: "320ms",
        state: "480ms",
        page: "400ms",
      },
      boxShadow: {
        panel: "0 24px 64px -24px rgba(0,0,0,.6)",
        insetTop: "inset 0 1px 0 rgba(255,255,255,.09)",
      },
      maxWidth: {
        shell: "1440px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
