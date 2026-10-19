CREATE UNIQUE INDEX `campus_hostels_name_unique` ON `campus_hostels` (lower("name"));
--> statement-breakpoint
INSERT OR IGNORE INTO campus_hostels (id,name,short,initials,created_at) VALUES
('general-bipin-rawat','General Bipin Rawat Bhawan','General Bipin Rawat','BR',0),
('tagore','Tagore Bhawan','Tagore','TB',1),
('patel','Patel Bhawan','Patel','PB',2),
('silver-jubilee','Silver Jubilee Bhawan','Silver Jubilee','SJ',3),
('vishwesharya','Vishwesharya Bhawan','Vishwesharya','VB',4),
('saraswati','Saraswati Bhawan','Saraswati','SB',5),
('mandakini','Mandakini Bhawan','Mandakini','MB',6),
('sarojini','Sarojini Bhawan','Sarojini','SN',7);
