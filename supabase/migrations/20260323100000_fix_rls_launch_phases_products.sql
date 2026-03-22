-- Fix RLS: substituir policies de launch_phases e launch_products que usam
-- get_user_project_role() (bloqueia INSERT) por política simples baseada em
-- project_members — igual ao padrão de launch_editions.

-- launch_phases
DROP POLICY IF EXISTS "Managers and owners can manage launch phases" ON launch_phases;

CREATE POLICY "launch_phases_project_access" ON launch_phases
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- launch_products
DROP POLICY IF EXISTS "Managers and owners can manage launch products" ON launch_products;

CREATE POLICY "launch_products_project_access" ON launch_products
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );
