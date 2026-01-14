import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Regra para bloquear imports diretos de react-router-dom em páginas internas
      // A verificação completa é feita pelo script check-tenant-navigation.js
      "no-restricted-imports": ["warn", {
        "paths": [
          {
            "name": "react-router-dom",
            "importNames": ["useNavigate"],
            "message": "Use useTenantNavigation() de '@/navigation' para navegação multi-tenant. Veja ARCHITECTURE_NAVIGATION.md"
          }
        ]
      }],
    },
  },
);
