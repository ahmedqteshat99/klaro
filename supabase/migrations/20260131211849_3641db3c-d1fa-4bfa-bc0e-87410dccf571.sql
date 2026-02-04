-- Add new columns for Anschreiben metadata and applied tracking
ALTER TABLE public.document_versions 
ADD COLUMN IF NOT EXISTS hospital_name text,
ADD COLUMN IF NOT EXISTS department_or_specialty text,
ADD COLUMN IF NOT EXISTS position_title text,
ADD COLUMN IF NOT EXISTS job_url text,
ADD COLUMN IF NOT EXISTS applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS applied_date date;

-- Create index for filtering by applied status
CREATE INDEX IF NOT EXISTS idx_document_versions_applied ON public.document_versions(applied);
CREATE INDEX IF NOT EXISTS idx_document_versions_typ ON public.document_versions(typ);
CREATE INDEX IF NOT EXISTS idx_document_versions_user_typ ON public.document_versions(user_id, typ);