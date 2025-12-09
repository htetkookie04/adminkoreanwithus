-- Timetable Management Schema
-- Korean With Us

CREATE TABLE timetable (
  id SERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  level TEXT NOT NULL, -- Beginner, Intermediate, Advanced, TOPIK
  day_of_week TEXT NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  teacher_name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, cancelled, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX timetable_day_of_week_idx ON timetable(day_of_week);
CREATE INDEX timetable_status_idx ON timetable(status);
CREATE INDEX timetable_start_time_idx ON timetable(start_time);

-- Trigger for updated_at
CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON timetable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

