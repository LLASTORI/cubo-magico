-- Create storage bucket for automation media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'automation-media',
  'automation-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'application/pdf']
);

-- Create table to track media files
CREATE TABLE public.automation_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_media
CREATE POLICY "Users can view media from their projects"
ON public.automation_media
FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload media to their projects"
ON public.automation_media
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete media from their projects"
ON public.automation_media
FOR DELETE
USING (
  project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid()
  )
);

-- Storage policies for automation-media bucket
CREATE POLICY "Authenticated users can upload automation media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'automation-media');

CREATE POLICY "Anyone can view automation media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'automation-media');

CREATE POLICY "Users can delete their automation media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'automation-media');