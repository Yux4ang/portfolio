CREATE TABLE IF NOT EXISTS portfolio_versions (
  revision INTEGER PRIMARY KEY,
  saved_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
