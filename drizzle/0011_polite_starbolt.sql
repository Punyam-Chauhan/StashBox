CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
INSERT INTO site_settings (id,value) VALUES (1,'{}');
