ALTER TABLE `players` ADD `wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `losses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `best_wave` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `crystals` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `sigils` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `materials` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `stamina` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill the new columns from any existing saves.progress_json blobs (before this
-- migration, those 7 fields lived only in the JSON) so no existing player's currency/
-- stats appear to reset to 0.
UPDATE players
SET
  wins = COALESCE((SELECT json_extract(s.progress_json, '$.wins') FROM saves s WHERE s.uid = players.uid), 0),
  losses = COALESCE((SELECT json_extract(s.progress_json, '$.losses') FROM saves s WHERE s.uid = players.uid), 0),
  best_wave = COALESCE((SELECT json_extract(s.progress_json, '$.bestWave') FROM saves s WHERE s.uid = players.uid), 0),
  crystals = COALESCE((SELECT json_extract(s.progress_json, '$.crystals') FROM saves s WHERE s.uid = players.uid), 0),
  sigils = COALESCE((SELECT json_extract(s.progress_json, '$.sigils') FROM saves s WHERE s.uid = players.uid), 0),
  materials = COALESCE((SELECT json_extract(s.progress_json, '$.materials') FROM saves s WHERE s.uid = players.uid), 0),
  stamina = COALESCE((SELECT json_extract(s.progress_json, '$.stamina') FROM saves s WHERE s.uid = players.uid), 0)
WHERE EXISTS (SELECT 1 FROM saves s WHERE s.uid = players.uid);
--> statement-breakpoint
-- Strip the now-promoted keys back out of the JSON blob so there is exactly one
-- source of truth per field going forward (idempotent: a no-op on blobs that never
-- had these keys, e.g. brand new players created after this migration).
UPDATE saves
SET progress_json = json_remove(progress_json, '$.wins', '$.losses', '$.bestWave', '$.crystals', '$.sigils', '$.materials', '$.stamina');