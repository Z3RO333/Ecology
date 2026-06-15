ALTER TABLE document_submissions
  ADD COLUMN IF NOT EXISTS responsible_name TEXT;
