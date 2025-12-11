-- Korean With Us - Lectures Schema Migration
-- PostgreSQL 14+

-- ============================================
-- LECTURES TABLE
-- ============================================

CREATE TABLE lectures (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  uploaded_by INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  role_of_uploader TEXT NOT NULL CHECK (role_of_uploader IN ('admin', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX lectures_course_idx ON lectures(course_id);
CREATE INDEX lectures_uploaded_by_idx ON lectures(uploaded_by);
CREATE INDEX lectures_created_at_idx ON lectures(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON lectures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE lectures IS 'Recorded lectures uploaded by admins and teachers';
COMMENT ON COLUMN lectures.course_id IS 'Foreign key to courses table';
COMMENT ON COLUMN lectures.video_url IS 'URL/path to the uploaded video file';
COMMENT ON COLUMN lectures.uploaded_by IS 'User ID of the person who uploaded the lecture';
COMMENT ON COLUMN lectures.role_of_uploader IS 'Role of the uploader at time of upload (admin or teacher)';

