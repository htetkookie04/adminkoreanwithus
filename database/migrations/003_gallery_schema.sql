-- Gallery Management Schema
-- Korean With Us

CREATE TABLE gallery (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX gallery_sort_order_idx ON gallery(sort_order);
CREATE INDEX gallery_created_at_idx ON gallery(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_gallery_updated_at BEFORE UPDATE ON gallery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

