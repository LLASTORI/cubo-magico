-- Fix legacy FK drift where meta_ads.adset_id incorrectly references meta_adsets.id (uuid).
-- This blocks canonical alignment of meta_ads.adset_id to TEXT.

DO $$
DECLARE
  fk record;
BEGIN
  -- Drop any FK on meta_ads.adset_id so type alignment can proceed.
  FOR fk IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.meta_ads'::regclass
      AND contype = 'f'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.meta_ads'::regclass AND attname = 'adset_id')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.meta_ads DROP CONSTRAINT IF EXISTS %I', fk.conname);
  END LOOP;
END $$;

-- Align to canonical schema: adset_id is TEXT (Meta external id), not UUID FK.
ALTER TABLE public.meta_ads
  ALTER COLUMN adset_id TYPE TEXT USING adset_id::text;

NOTIFY pgrst, 'reload schema';
