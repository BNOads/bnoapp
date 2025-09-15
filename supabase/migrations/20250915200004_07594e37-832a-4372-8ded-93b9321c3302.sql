-- Create storage buckets for pauta media
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('pauta-images', 'pauta-images', true),
  ('pauta-videos', 'pauta-videos', true);

-- Create RLS policies for pauta images
CREATE POLICY "Anyone can view pauta images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pauta-images');

CREATE POLICY "Authenticated users can upload pauta images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pauta-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their pauta images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pauta-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete pauta images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pauta-images' AND auth.role() = 'authenticated');

-- Create RLS policies for pauta videos
CREATE POLICY "Anyone can view pauta videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pauta-videos');

CREATE POLICY "Authenticated users can upload pauta videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pauta-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their pauta videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pauta-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete pauta videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pauta-videos' AND auth.role() = 'authenticated');