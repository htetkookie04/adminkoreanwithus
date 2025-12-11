-- Korean With Us - Make video_url nullable in lectures
-- PostgreSQL 14+

-- Make video_url nullable (allows lectures without video)
ALTER TABLE lectures ALTER COLUMN video_url DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN lectures.video_url IS 'URL/path to the uploaded video file (optional)';

