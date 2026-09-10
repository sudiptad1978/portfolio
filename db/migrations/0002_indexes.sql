-- 0002_indexes.sql — query-path indexes (architecture §8.2)

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_experience_start_date ON experience(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions(status);
