-- Job board, applications, inbox, and user documents

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================
-- Jobs
-- ===============================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  hospital_name TEXT,
  department TEXT,
  location TEXT,
  description TEXT,
  requirements TEXT,
  contact_email TEXT,
  contact_name TEXT,
  apply_url TEXT,
  tags TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  expires_at DATE
);

CREATE INDEX IF NOT EXISTS idx_jobs_published ON jobs(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can manage jobs" ON jobs;

CREATE POLICY "Users can view published jobs"
  ON jobs FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = TRUE);

CREATE POLICY "Admins can manage jobs"
  ON jobs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- Applications
-- ===============================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  recipient_email TEXT NOT NULL,
  sender_email TEXT NOT NULL DEFAULT 'bewerbungen@klaro.tools',
  subject TEXT,
  message_text TEXT,
  message_html TEXT,
  reply_to TEXT,
  reply_token TEXT,
  cover_letter_document_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  cv_document_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  error_message TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_created ON applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can create own applications" ON applications;
DROP POLICY IF EXISTS "Users can update own applications" ON applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;

CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON applications FOR SELECT
  USING (public.is_admin());

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- Application messages (inbox)
-- ===============================
CREATE TABLE IF NOT EXISTS application_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  subject TEXT,
  sender TEXT,
  recipient TEXT,
  reply_to TEXT,
  message_id TEXT,
  provider_message_id TEXT,
  text_body TEXT,
  html_body TEXT,
  headers JSONB,
  payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_messages_app_created
  ON application_messages(application_id, created_at DESC);

ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for own applications" ON application_messages;
DROP POLICY IF EXISTS "Users can update messages for own applications" ON application_messages;
DROP POLICY IF EXISTS "Service role can insert messages" ON application_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON application_messages;

CREATE POLICY "Users can view messages for own applications"
  ON application_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages for own applications"
  ON application_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert messages"
  ON application_messages FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view all messages"
  ON application_messages FOR SELECT
  USING (public.is_admin());

-- ===============================
-- User documents (vault)
-- ===============================
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  title TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  expires_at DATE,
  include_by_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_type
  ON user_documents(user_id, doc_type);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can create own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON user_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON user_documents;
DROP POLICY IF EXISTS "Admins can view all user documents" ON user_documents;

CREATE POLICY "Users can view own documents"
  ON user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents"
  ON user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON user_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON user_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user documents"
  ON user_documents FOR SELECT
  USING (public.is_admin());

DROP TRIGGER IF EXISTS update_user_documents_updated_at ON user_documents;
CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON user_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- Application attachments
-- ===============================
CREATE TABLE IF NOT EXISTS application_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_document_id UUID REFERENCES user_documents(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_attachments_app
  ON application_attachments(application_id);

ALTER TABLE application_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own application attachments" ON application_attachments;
DROP POLICY IF EXISTS "Users can create own application attachments" ON application_attachments;
DROP POLICY IF EXISTS "Users can delete own application attachments" ON application_attachments;

CREATE POLICY "Users can view own application attachments"
  ON application_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own application attachments"
  ON application_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own application attachments"
  ON application_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );
