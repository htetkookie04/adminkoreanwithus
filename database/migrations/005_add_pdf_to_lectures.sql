-- Korean With Us - Add PDF Support to Lectures
-- PostgreSQL 14+

-- Add pdf_url column to lectures table
ALTER TABLE lectures ADD COLUMN pdf_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN lectures.pdf_url IS 'URL/path to the uploaded PDF file (optional)';

