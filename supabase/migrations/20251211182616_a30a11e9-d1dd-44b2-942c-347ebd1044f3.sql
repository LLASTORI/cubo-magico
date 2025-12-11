-- Add super admin access to all project-related tables

-- offer_mappings
CREATE POLICY "Super admins can view all offer mappings" 
ON public.offer_mappings 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all offer mappings" 
ON public.offer_mappings 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- funnel_changes
CREATE POLICY "Super admins can view all funnel changes" 
ON public.funnel_changes 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all funnel changes" 
ON public.funnel_changes 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- funnels
CREATE POLICY "Super admins can view all funnels" 
ON public.funnels 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all funnels" 
ON public.funnels 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- hotmart_sales
CREATE POLICY "Super admins can view all sales" 
ON public.hotmart_sales 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all sales" 
ON public.hotmart_sales 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- meta_campaigns
CREATE POLICY "Super admins can view all meta campaigns" 
ON public.meta_campaigns 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all meta campaigns" 
ON public.meta_campaigns 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- meta_insights
CREATE POLICY "Super admins can view all meta insights" 
ON public.meta_insights 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all meta insights" 
ON public.meta_insights 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- meta_ad_accounts
CREATE POLICY "Super admins can view all meta ad accounts" 
ON public.meta_ad_accounts 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all meta ad accounts" 
ON public.meta_ad_accounts 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- meta_adsets
CREATE POLICY "Super admins can view all meta adsets" 
ON public.meta_adsets 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all meta adsets" 
ON public.meta_adsets 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- meta_ads
CREATE POLICY "Super admins can view all meta ads" 
ON public.meta_ads 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all meta ads" 
ON public.meta_ads 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- meta_credentials
CREATE POLICY "Super admins can view all meta credentials" 
ON public.meta_credentials 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all meta credentials" 
ON public.meta_credentials 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- project_credentials
CREATE POLICY "Super admins can view all project credentials" 
ON public.project_credentials 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all project credentials" 
ON public.project_credentials 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- funnel_meta_accounts
CREATE POLICY "Super admins can view all funnel meta accounts" 
ON public.funnel_meta_accounts 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all funnel meta accounts" 
ON public.funnel_meta_accounts 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- funnel_score_history
CREATE POLICY "Super admins can view all funnel score history" 
ON public.funnel_score_history 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all funnel score history" 
ON public.funnel_score_history 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));