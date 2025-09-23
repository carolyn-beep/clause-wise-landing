-- Create private contracts storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', false);

-- Create RLS policy for reading own contract files
CREATE POLICY "Read own contract files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy for writing own contract files
CREATE POLICY "Write own contract files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy for updating own contract files
CREATE POLICY "Update own contract files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
) 
WITH CHECK (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy for deleting own contract files
CREATE POLICY "Delete own contract files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'contracts' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);