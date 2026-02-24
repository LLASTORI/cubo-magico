import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/integrations/supabase/types.ts"] },
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
      // Etapa 1 (upgrade de infraestrutura): manter baseline atual do projeto
      // sem forçar refactor massivo de tipagem e regras novas do ESLint 10.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off",
      "no-useless-assignment": "off",
      "no-case-declarations": "off",
      "no-misleading-character-class": "off",
      "preserve-caught-error": "off",
      "no-shadow-restricted-names": "off",
      "no-empty": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/rules-of-hooks": "warn",
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
