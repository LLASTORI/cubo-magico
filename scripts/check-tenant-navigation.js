#!/usr/bin/env node

/**
 * @fileoverview Script de verificação de navegação multi-tenant.
 * 
 * Este script verifica se há navegações absolutas que escapam do tenant
 * em arquivos dentro de src/pages e src/components.
 * 
 * Uso:
 *   node scripts/check-tenant-navigation.js
 * 
 * Em CI:
 *   npm run check:navigation
 * 
 * @see ARCHITECTURE_NAVIGATION.md
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Padrões proibidos em navegação interna
const FORBIDDEN_PATTERNS = [
  // Navegações absolutas para rotas internas
  /navigate\s*\(\s*['"`]\/(?!auth|projects|privacy|terms|data-deletion|reset-password|forgot-password|accept-invite|activate-account|onboarding|app\/)/g,
  /to\s*=\s*['"`]\/(?!auth|projects|privacy|terms|data-deletion|reset-password|forgot-password|accept-invite|activate-account|onboarding|app\/)/g,
  /href\s*=\s*['"`]\/(?!auth|projects|privacy|terms|data-deletion|reset-password|forgot-password|accept-invite|activate-account|onboarding|app\/)/g,
];

// Padrões de import perigosos
const DANGEROUS_IMPORTS = [
  /import\s*{[^}]*useNavigate[^}]*}\s*from\s*['"]react-router-dom['"]/g,
  /import\s*{[^}]*Link[^}]*}\s*from\s*['"]react-router-dom['"]/g,
];

// Diretórios a verificar
const DIRS_TO_CHECK = [
  'src/pages',
  'src/components',
];

// Arquivos a ignorar (rotas públicas ou especiais)
const IGNORED_FILES = [
  'Auth.tsx',
  'ForgotPassword.tsx',
  'ResetPassword.tsx',
  'PrivacyPolicy.tsx',
  'TermsOfService.tsx',
  'DataDeletion.tsx',
  'AcceptInvite.tsx',
  'ActivateAccount.tsx',
  'Onboarding.tsx',
  'NotFound.tsx',
  'NoAccess.tsx',
  'Projects.tsx',
  'ProtectedRoute.tsx',
  'ProtectedAreaRoute.tsx',
  'ProjectBootstrapGate.tsx',
  'ProjectLayout.tsx',
  // Componentes públicos de quiz/survey
  'QuizPublic.tsx',
  'SurveyPublic.tsx',
  'SurveyPublicLegacy.tsx',
  // Subdiretórios públicos
  'public/',
];

// Arquivos que podem usar Link para rotas públicas
const LINK_ALLOWED_FILES = [
  'CuboLogo.tsx', // Link para home pública
  'HeroSection.tsx',
];

let violations = [];
let warnings = [];

function shouldIgnoreFile(filePath) {
  return IGNORED_FILES.some(ignored => filePath.includes(ignored));
}

function isLinkAllowed(filePath) {
  return LINK_ALLOWED_FILES.some(allowed => filePath.includes(allowed));
}

function checkFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Verificar imports perigosos (apenas warning se usar useProjectNavigation também)
  const usesProjectNavigation = content.includes('useProjectNavigation') || 
                                 content.includes('useTenantNavigation');
  
  DANGEROUS_IMPORTS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches && !usesProjectNavigation) {
      matches.forEach(match => {
        const lineNum = lines.findIndex(line => line.includes(match.split('\n')[0])) + 1;
        violations.push({
          file: filePath,
          line: lineNum,
          type: 'IMPORT_DIRETO',
          code: match.trim(),
          message: 'Import direto de react-router-dom sem usar useProjectNavigation/useTenantNavigation',
        });
      });
    }
  });

  // Verificar navegações absolutas
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    FORBIDDEN_PATTERNS.forEach(pattern => {
      pattern.lastIndex = 0; // Reset regex
      const matches = line.match(pattern);
      
      if (matches) {
        matches.forEach(match => {
          // Ignorar se é um comentário
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return;
          }
          
          // Ignorar Links em arquivos permitidos
          if (match.includes('to=') && isLinkAllowed(filePath)) {
            return;
          }
          
          violations.push({
            file: filePath,
            line: lineNum,
            type: 'ROTA_ABSOLUTA',
            code: match.trim(),
            message: 'Navegação absoluta que escapa do tenant',
          });
        });
      }
    });
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`${YELLOW}⚠️  Diretório não encontrado: ${dir}${RESET}`);
    return;
  }

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      checkFile(filePath);
    }
  });
}

// Executar verificação
console.log('\n🔍 Verificando navegação multi-tenant...\n');

DIRS_TO_CHECK.forEach(dir => {
  console.log(`📁 Verificando ${dir}/`);
  walkDir(dir);
});

// Relatório
console.log('\n' + '='.repeat(60) + '\n');

if (violations.length === 0) {
  console.log(`${GREEN}✅ Nenhuma violação de navegação encontrada!${RESET}\n`);
  console.log('Todas as navegações respeitam o padrão multi-tenant.\n');
  process.exit(0);
} else {
  console.log(`${RED}❌ ${violations.length} violação(ões) encontrada(s):${RESET}\n`);
  
  violations.forEach((v, i) => {
    console.log(`${RED}[${i + 1}] ${v.type}${RESET}`);
    console.log(`    📄 ${v.file}:${v.line}`);
    console.log(`    💻 ${v.code}`);
    console.log(`    💡 ${v.message}\n`);
  });
  
  console.log(`${YELLOW}📖 Consulte ARCHITECTURE_NAVIGATION.md para correção.${RESET}\n`);
  process.exit(1);
}
