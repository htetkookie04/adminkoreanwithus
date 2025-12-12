-- Korean With Us - Add Resource Link URL to Lectures
-- PostgreSQL 14+

-- ============================================
-- ADD RESOURCE_LINK_URL COLUMN TO LECTURES TABLE
-- ============================================

ALTER TABLE lectures
ADD COLUMN resource_link_url TEXT;

-- Comments for documentation
COMMENT ON COLUMN lectures.resource_link_url IS 'Optional URL for external resources (articles, websites, flashcard sets, etc.)';

