-- 0001_init.sql — D1 schema (architecture §8.1)
-- Applied with: npm run db:migrate (local) / npm run db:migrate:remote (production)

-- profile: singleton row, optional — most sites keep this in site.config.ts instead.
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT,
  avatar_r2_key TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,        -- 'linkedin' | 'github' | 'x' | 'medium' ...
  url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL,      -- ISO 8601, day precision
  end_date TEXT,                 -- NULL = current
  summary TEXT,
  highlights_json TEXT,          -- JSON array of bullet strings
  tags_json TEXT,                -- JSON array
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,                 -- 'automation' | 'cloud' | 'security' ...
  proficiency INTEGER,           -- 1-5, optional
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  repo_url TEXT,
  live_url TEXT,
  cover_image_r2_key TEXT,
  tags_json TEXT,
  featured INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  credential_url TEXT
);

CREATE TABLE IF NOT EXISTS education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution TEXT NOT NULL,
  degree TEXT,
  start_date TEXT,
  end_date TEXT
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name TEXT NOT NULL,
  author_role TEXT,
  quote TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- blog_posts: the syndication cache (architecture §9)
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,             -- 'medium' | 'rss' | 'cms'
  external_id TEXT NOT NULL,        -- GUID from feed, used for dedup
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content_html TEXT,                -- sanitized HTML snapshot
  cover_image TEXT,
  author_name TEXT,
  tags_json TEXT,
  reading_time_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'published',  -- 'draft' | 'published' | 'failed'
  published_at TEXT NOT NULL,
  synced_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source, external_id)
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  turnstile_verified INTEGER DEFAULT 0,
  ip_hash TEXT,                     -- store a hash, never raw IP long-term
  status TEXT DEFAULT 'new',        -- 'new' | 'read' | 'archived' | 'spam'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,             -- 'success' | 'partial' | 'failed'
  items_fetched INTEGER,
  items_upserted INTEGER,
  error_message TEXT,
  run_at TEXT DEFAULT (datetime('now'))
);
