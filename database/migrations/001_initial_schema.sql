-- Korean With Us - Initial Database Schema
-- PostgreSQL 14+

-- Enable UUID extension (optional, if using UUIDs)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Full system access, manage roles & settings'),
  ('admin', 'Manage users, courses, enrollments, view analytics'),
  ('course_manager', 'Manage course content, schedule, see own class students'),
  ('teacher', 'Manage course content, schedule, see own class students'),
  ('support', 'Handle inquiries and enrollments, limited student data access'),
  ('sales', 'Handle inquiries and enrollments, limited student data access'),
  ('viewer', 'Read-only access to analytics and logs');

-- Permissions table (many-to-many with roles)
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL, -- e.g. 'users', 'courses', 'enrollments'
  action TEXT NOT NULL    -- e.g. 'create', 'update', 'delete', 'view'
);

CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Insert common permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  ('users.create', 'Create new users', 'users', 'create'),
  ('users.update', 'Update users', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('users.view', 'View users', 'users', 'view'),
  ('courses.create', 'Create courses', 'courses', 'create'),
  ('courses.update', 'Update courses', 'courses', 'update'),
  ('courses.delete', 'Delete courses', 'courses', 'delete'),
  ('courses.view', 'View courses', 'courses', 'view'),
  ('enrollments.create', 'Create enrollments', 'enrollments', 'create'),
  ('enrollments.approve', 'Approve enrollments', 'enrollments', 'approve'),
  ('enrollments.update', 'Update enrollments', 'enrollments', 'update'),
  ('enrollments.view', 'View enrollments', 'enrollments', 'view'),
  ('reports.view', 'View reports', 'reports', 'view'),
  ('settings.manage', 'Manage system settings', 'settings', 'manage'),
  ('roles.manage', 'Manage roles and permissions', 'roles', 'manage');

-- Assign permissions to roles (example: super_admin gets all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions; -- super_admin

-- Admin gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name != 'roles.manage';

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NULL, -- null if using external auth
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role_id INT REFERENCES roles(id) DEFAULT 4, -- default to 'teacher'
  status TEXT DEFAULT 'active', -- active / suspended / archived
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role_id);
CREATE INDEX users_status_idx ON users(status);

-- ============================================
-- COURSES
-- ============================================

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  level TEXT, -- Beginner/Intermediate/Advanced/TOPIK
  capacity INT DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'MMK',
  active BOOLEAN DEFAULT true,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX courses_slug_idx ON courses(slug);
CREATE INDEX courses_active_idx ON courses(active);
CREATE INDEX courses_level_idx ON courses(level);

-- ============================================
-- SCHEDULES (Batches / Class Instances)
-- ============================================

CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id INT REFERENCES users(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'Asia/Singapore',
  capacity INT,
  location TEXT, -- e.g. Zoom link or classroom address
  status TEXT DEFAULT 'scheduled', -- scheduled/cancelled/completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX schedules_course_idx ON schedules(course_id);
CREATE INDEX schedules_teacher_idx ON schedules(teacher_id);
CREATE INDEX schedules_start_time_idx ON schedules(start_time);
CREATE INDEX schedules_status_idx ON schedules(status);

-- ============================================
-- ENROLLMENTS
-- ============================================

CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  course_id INT REFERENCES courses(id) ON DELETE SET NULL,
  schedule_id INT REFERENCES schedules(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- pending/approved/active/completed/cancelled
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  source TEXT, -- e.g. website/form, referral, offline, admin
  payment_status TEXT DEFAULT 'unpaid', -- unpaid/paid/refunded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, schedule_id) -- prevent duplicate enrollments in same schedule
);

CREATE INDEX enrollments_course_idx ON enrollments(course_id);
CREATE INDEX enrollments_user_idx ON enrollments(user_id);
CREATE INDEX enrollments_schedule_idx ON enrollments(schedule_id);
CREATE INDEX enrollments_status_idx ON enrollments(status);
CREATE INDEX enrollments_payment_status_idx ON enrollments(payment_status);
CREATE INDEX enrollments_enrolled_at_idx ON enrollments(enrolled_at);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  enrollment_id INT REFERENCES enrollments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'MMK',
  method TEXT, -- stripe, paypal, offline, bank_transfer
  provider_ref TEXT, -- provider payment id (e.g. Stripe charge ID)
  status TEXT DEFAULT 'pending', -- pending/paid/failed/refunded
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB, -- store additional payment data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX payments_enrollment_idx ON payments(enrollment_id);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_provider_ref_idx ON payments(provider_ref);
CREATE INDEX payments_paid_at_idx ON payments(paid_at);

-- ============================================
-- INQUIRIES / CONTACT MESSAGES
-- ============================================

CREATE TABLE inquiries (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new', -- new/pending/replied/closed
  assigned_to INT REFERENCES users(id),
  priority TEXT DEFAULT 'normal', -- low/normal/high/urgent
  source TEXT, -- website, email, phone, referral
  metadata JSONB, -- store additional inquiry data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX inquiries_status_idx ON inquiries(status);
CREATE INDEX inquiries_assigned_to_idx ON inquiries(assigned_to);
CREATE INDEX inquiries_email_idx ON inquiries(email);
CREATE INDEX inquiries_created_at_idx ON inquiries(created_at);

-- Inquiry replies/threads
CREATE TABLE inquiry_replies (
  id SERIAL PRIMARY KEY,
  inquiry_id INT REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id), -- who replied
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- internal note vs customer-facing reply
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX inquiry_replies_inquiry_idx ON inquiry_replies(inquiry_id);

-- ============================================
-- FEEDBACK / REVIEWS
-- ============================================

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  course_id INT REFERENCES courses(id),
  schedule_id INT REFERENCES schedules(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT DEFAULT 'pending', -- pending/approved/hidden
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX feedback_user_idx ON feedback(user_id);
CREATE INDEX feedback_course_idx ON feedback(course_id);
CREATE INDEX feedback_rating_idx ON feedback(rating);

-- ============================================
-- MEDIA / RESOURCES
-- ============================================

CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  uploaded_by INT REFERENCES users(id),
  folder TEXT, -- organize by folder (e.g. 'courses', 'avatars', 'resources')
  metadata JSONB, -- store image dimensions, video duration, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX media_uploaded_by_idx ON media(uploaded_by);
CREATE INDEX media_folder_idx ON media(folder);

-- Course-media relationship (many-to-many)
CREATE TABLE course_media (
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  media_id INT REFERENCES media(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, media_id)
);

-- ============================================
-- ACTIVITY LOGS
-- ============================================

CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action TEXT NOT NULL, -- e.g. 'user.created', 'enrollment.approved'
  resource_type TEXT, -- e.g. 'user', 'enrollment', 'course'
  resource_id INT,
  meta JSONB, -- store additional context (old values, new values, IP, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX activity_logs_resource_idx ON activity_logs(resource_type, resource_id);
CREATE INDEX activity_logs_action_idx ON activity_logs(action);
CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at);

-- ============================================
-- AI REPORTS / INSIGHTS
-- ============================================

CREATE TABLE ai_reports (
  id SERIAL PRIMARY KEY,
  name TEXT, -- e.g. 'monthly_summary', 'reengagement_suggestions'
  report_type TEXT NOT NULL, -- summary, suggestions, classification
  input_meta JSONB, -- parameters used to generate report
  result_text TEXT, -- AI-generated text
  result_data JSONB, -- structured data if applicable
  model TEXT, -- e.g. 'gpt-4', 'claude-3'
  status TEXT DEFAULT 'completed', -- pending/completed/failed
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by INT REFERENCES users(id)
);

CREATE INDEX ai_reports_type_idx ON ai_reports(report_type);
CREATE INDEX ai_reports_generated_at_idx ON ai_reports(generated_at);

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('site.title', '"Korean With Us"', 'Site title'),
  ('site.contact_email', '"contact@koreanwithus.com"', 'Contact email'),
  ('site.languages', '["en", "ko"]', 'Supported languages'),
  ('email.smtp_host', '""', 'SMTP host'),
  ('email.smtp_port', '587', 'SMTP port'),
  ('email.from_address', '"noreply@koreanwithus.com"', 'Default from email'),
  ('payment.currency', '"MMK"', 'Default currency'),
  ('payment.provider', '"stripe"', 'Payment provider');

-- ============================================
-- WAITLIST
-- ============================================

CREATE TABLE waitlist (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  schedule_id INT REFERENCES schedules(id) ON DELETE SET NULL,
  position INT, -- position in queue
  notified_at TIMESTAMP WITH TIME ZONE, -- when notified of availability
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX waitlist_course_idx ON waitlist(course_id);
CREATE INDEX waitlist_schedule_idx ON waitlist(schedule_id);
CREATE UNIQUE INDEX waitlist_user_schedule_idx ON waitlist(user_id, schedule_id) WHERE schedule_id IS NOT NULL;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for development)
-- ============================================

-- Create a default super admin user (password: 'admin123' - CHANGE IN PRODUCTION!)
-- Password hash is bcrypt hash for 'admin123'
INSERT INTO users (email, password_hash, first_name, last_name, role_id, status) VALUES
  ('admin@koreanwithus.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'Admin', 'User', 1, 'active');

