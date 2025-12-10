import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Cubo Mágico Color Palette
        cube: {
          blue: "hsl(var(--cube-blue))",
          red: "hsl(var(--cube-red))",
          green: "hsl(var(--cube-green))",
          yellow: "hsl(var(--cube-yellow))",
          orange: "hsl(var(--cube-orange))",
          white: "hsl(var(--cube-white))",
        },
        cyan: {
          DEFAULT: "hsl(var(--cyan-accent))",
        },
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
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-cube': 'var(--gradient-cube)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-hero': 'var(--gradient-hero)',
      },
      boxShadow: {
        'elegant': 'var(--shadow-elegant)',
        'card-custom': 'var(--shadow-card)',
        'cube': 'var(--shadow-cube)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cubeRotate: {
          "0%": { transform: "rotateY(0deg) rotateX(0deg)" },
          "25%": { transform: "rotateY(90deg) rotateX(0deg)" },
          "50%": { transform: "rotateY(180deg) rotateX(90deg)" },
          "75%": { transform: "rotateY(270deg) rotateX(90deg)" },
          "100%": { transform: "rotateY(360deg) rotateX(0deg)" },
        },
        cubeSpin: {
          "0%": { transform: "rotateX(-20deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(-20deg) rotateY(360deg)" },
        },
        colorShift: {
          "0%, 100%": { borderColor: "hsl(var(--cube-blue))" },
          "20%": { borderColor: "hsl(var(--cube-red))" },
          "40%": { borderColor: "hsl(var(--cube-green))" },
          "60%": { borderColor: "hsl(var(--cube-yellow))" },
          "80%": { borderColor: "hsl(var(--cube-orange))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "cube-rotate": "cubeRotate 8s ease-in-out infinite",
        "cube-spin": "cubeSpin 3s linear infinite",
        "color-shift": "colorShift 5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
