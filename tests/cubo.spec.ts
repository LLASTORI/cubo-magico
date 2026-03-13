import { test, expect } from '@playwright/test';

test.describe('Cubo Mágico - smoke test', () => {
  test('abre o app e redireciona para a tela de login', async ({ page }) => {
    await page.goto('/');

    // Deve redirecionar para /auth
    await expect(page).toHaveURL(/\/auth/);
  });

  test('tela de login exibe logo e campos esperados', async ({ page }) => {
    await page.goto('/auth');

    // Logo / branding
    await expect(page.getByText('Cubo', { exact: false })).toBeVisible();

    // Abas de login e cadastro
    await expect(page.getByRole('tab', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Criar conta' })).toBeVisible();

    // Campos de email e senha visíveis na aba de login (ativa por padrão)
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();

    // Botão de submit
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
  });

  test('exibe erro ao tentar login com credenciais inválidas', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill('teste@invalido.com');
    await page.getByLabel('Senha').fill('senhaerrada123');
    await page.getByRole('button', { name: /Entrar/i }).click();

    // Deve exibir alguma mensagem de erro (toast ou inline)
    await expect(
      page.getByText(/inválid|incorret|erro|Invalid/i).first()
    ).toBeVisible({ timeout: 8000 });
  });
});
