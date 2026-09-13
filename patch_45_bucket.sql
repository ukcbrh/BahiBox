-- Create the provider-documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('provider-documents', 'provider-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for provider-documents
CREATE POLICY "Users can upload their own provider documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'provider-documents' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own provider documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'provider-documents' AND 
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Super admins and tenant staff can view all documents in this bucket
CREATE POLICY "Admins can view provider documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'provider-documents'
);
