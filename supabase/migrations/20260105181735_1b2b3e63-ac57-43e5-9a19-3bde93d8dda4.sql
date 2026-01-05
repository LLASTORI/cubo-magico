-- Update CRM-related policies to use granular permissions
DROP POLICY IF EXISTS "Managers and owners can manage contact identity events" ON contact_identity_events;
CREATE POLICY "Members with crm edit permission can manage contact identity events" ON contact_identity_events
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can delete crm activities" ON crm_activities;
DROP POLICY IF EXISTS "Managers and owners can update crm activities" ON crm_activities;
CREATE POLICY "Members with crm edit permission can manage crm activities" ON crm_activities
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage activities" ON crm_activities_tasks;
CREATE POLICY "Members with crm edit permission can manage activities tasks" ON crm_activities_tasks
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage cadences" ON crm_cadences;
CREATE POLICY "Members with crm edit permission can manage cadences" ON crm_cadences
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage cadence steps" ON crm_cadence_steps;
CREATE POLICY "Members with crm edit permission can manage cadence steps" ON crm_cadence_steps
FOR ALL USING (
  EXISTS (SELECT 1 FROM crm_cadences c WHERE c.id = crm_cadence_steps.cadence_id AND has_area_permission(auth.uid(), c.project_id, 'crm', 'edit'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM crm_cadences c WHERE c.id = crm_cadence_steps.cadence_id AND has_area_permission(auth.uid(), c.project_id, 'crm', 'edit'))
);

DROP POLICY IF EXISTS "Managers and owners can manage contact cadences" ON crm_contact_cadences;
CREATE POLICY "Members with crm edit permission can manage contact cadences" ON crm_contact_cadences
FOR ALL USING (
  EXISTS (SELECT 1 FROM crm_contacts c WHERE c.id = crm_contact_cadences.contact_id AND has_area_permission(auth.uid(), c.project_id, 'crm', 'edit'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM crm_contacts c WHERE c.id = crm_contact_cadences.contact_id AND has_area_permission(auth.uid(), c.project_id, 'crm', 'edit'))
);

DROP POLICY IF EXISTS "Managers and owners can manage contacts" ON crm_contacts;
CREATE POLICY "Members with crm edit permission can manage contacts" ON crm_contacts
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage contact interactions" ON crm_contact_interactions;
CREATE POLICY "Members with crm edit permission can manage contact interactions" ON crm_contact_interactions
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage pipeline stages" ON crm_pipeline_stages;
CREATE POLICY "Members with crm edit permission can manage pipeline stages" ON crm_pipeline_stages
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage recovery activities" ON crm_recovery_activities;
CREATE POLICY "Members with crm edit permission can manage recovery activities" ON crm_recovery_activities
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage recovery stages" ON crm_recovery_stages;
CREATE POLICY "Members with crm edit permission can manage recovery stages" ON crm_recovery_stages
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage transactions" ON crm_transactions;
CREATE POLICY "Members with crm edit permission can manage transactions" ON crm_transactions
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'crm', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'crm', 'edit'));