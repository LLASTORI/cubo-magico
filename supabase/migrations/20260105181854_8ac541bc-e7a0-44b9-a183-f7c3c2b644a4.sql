-- Update Social Listening policies with correct table names
DROP POLICY IF EXISTS "Managers and owners can manage social comments" ON social_comments;
CREATE POLICY "Members with social_listening edit permission can manage social comments" ON social_comments
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage social listening pages" ON social_listening_pages;
CREATE POLICY "Members with social_listening edit permission can manage social listening pages" ON social_listening_pages
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage social posts" ON social_posts;
CREATE POLICY "Members with social_listening edit permission can manage social posts" ON social_posts
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'));

DROP POLICY IF EXISTS "Managers and owners can manage social listening sync logs" ON social_listening_sync_logs;
CREATE POLICY "Members with social_listening edit permission can manage social listening sync logs" ON social_listening_sync_logs
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'social_listening', 'edit'));

-- Also update survey_responses table
DROP POLICY IF EXISTS "Managers and owners can manage survey responses" ON survey_responses;
CREATE POLICY "Members with pesquisas edit permission can manage survey responses" ON survey_responses
FOR ALL USING (
  EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_responses.survey_id AND has_area_permission(auth.uid(), s.project_id, 'pesquisas', 'edit'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_responses.survey_id AND has_area_permission(auth.uid(), s.project_id, 'pesquisas', 'edit'))
);

-- Update survey_ai_knowledge_base table
DROP POLICY IF EXISTS "Managers and owners can manage survey ai knowledge base" ON survey_ai_knowledge_base;
CREATE POLICY "Members with pesquisas edit permission can manage survey ai knowledge base" ON survey_ai_knowledge_base
FOR ALL USING (has_area_permission(auth.uid(), project_id, 'pesquisas', 'edit'))
WITH CHECK (has_area_permission(auth.uid(), project_id, 'pesquisas', 'edit'));