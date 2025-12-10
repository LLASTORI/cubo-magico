-- Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_projects integer NOT NULL DEFAULT 1,
  price_cents integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'expired', 'cancelled', 'pending');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status subscription_status NOT NULL DEFAULT 'pending',
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  is_trial boolean DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans policies (everyone can view active plans, super admins can manage)
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage plans"
  ON public.plans FOR ALL
  USING (is_super_admin(auth.uid()));

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (is_super_admin(auth.uid()));

-- Update trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for plans
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.plans (name, description, max_projects, price_cents) VALUES
  ('Básico', '1 projeto incluso', 1, 9700),
  ('Pro', '3 projetos inclusos', 3, 19700),
  ('Business', '10 projetos inclusos', 10, 49700),
  ('Ilimitado', 'Projetos ilimitados', 0, 99700);

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status IN ('active', 'trial')
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.is_trial = false OR s.trial_ends_at IS NULL OR s.trial_ends_at > now())
  )
$$;

-- Function to get user's max projects from subscription
CREATE OR REPLACE FUNCTION public.get_user_max_projects(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.max_projects
     FROM public.subscriptions s
     JOIN public.plans p ON s.plan_id = p.id
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trial')
       AND (s.expires_at IS NULL OR s.expires_at > now())
     LIMIT 1),
    0
  )
$$;