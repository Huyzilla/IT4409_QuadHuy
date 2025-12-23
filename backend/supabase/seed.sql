-- Seed data for Supabase (idempotent)
-- Mirrors the intent of prisma/seed.ts without requiring Prisma.

BEGIN;

-- 1) Admin user (admin / 123456)
-- Password is bcrypt hash of '123456'.
INSERT INTO "users" ("id", "username", "full_name", "email", "password", "avatar", "role_id", "created_at", "updated_at")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'Quản trị viên Hệ thống',
  'admin@traffic.ai',
  '$2b$10$jamU8z4ENLr30u8eMeaIEuf.4hwVdHGJKG.gbk9llyDZXe4Co6jaC',
  NULL,
  0,
  NOW(),
  NOW()
)
ON CONFLICT ("username") DO UPDATE
SET "email" = EXCLUDED."email",
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role_id" = 0,
  "updated_at" = NOW();

-- Ensure email uniqueness path also converges
INSERT INTO "users" ("id", "username", "full_name", "email", "password", "avatar", "role_id", "created_at", "updated_at")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'Quản trị viên Hệ thống',
  'admin@traffic.ai',
  '$2b$10$jamU8z4ENLr30u8eMeaIEuf.4hwVdHGJKG.gbk9llyDZXe4Co6jaC',
  NULL,
  0,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE
SET "username" = EXCLUDED."username",
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role_id" = 0,
    "updated_at" = NOW();

-- 2) Intersections
INSERT INTO "intersections" ("id", "name", "latitude", "longitude", "description", "created_at", "updated_at")
VALUES (1, 'Ngã Tư Sở', 21.0, 105.8, 'auto-seeded', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "latitude" = EXCLUDED."latitude",
    "longitude" = EXCLUDED."longitude",
    "description" = EXCLUDED."description",
    "updated_at" = NOW();

INSERT INTO "intersections" ("id", "name", "latitude", "longitude", "description", "created_at", "updated_at")
VALUES (2, 'Đại Cồ Việt', 21.001, 105.801, 'auto-seeded', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "latitude" = EXCLUDED."latitude",
    "longitude" = EXCLUDED."longitude",
    "description" = EXCLUDED."description",
    "updated_at" = NOW();

-- 3) Cameras (8)
INSERT INTO "cameras" ("id", "name", "video_source", "latitude", "longitude", "threshold", "max_vehicles", "ai_enabled", "intersection_id", "created_at", "updated_at")
VALUES
  (1, 'North',  'rtsp://mediamtx:8554/north',  21.0,   105.8,   0.7, 5, TRUE, 1, NOW(), NOW()),
  (2, 'East',   'rtsp://mediamtx:8554/east',   21.0,   105.8,   0.7, 5, TRUE, 1, NOW(), NOW()),
  (3, 'South',  'rtsp://mediamtx:8554/south',  21.0,   105.8,   0.7, 5, TRUE, 1, NOW(), NOW()),
  (4, 'West',   'rtsp://mediamtx:8554/west',   21.0,   105.8,   0.7, 5, TRUE, 1, NOW(), NOW()),
  (5, 'North 1','rtsp://mediamtx:8554/north1', 21.001, 105.801, 0.7, 5, TRUE, 2, NOW(), NOW()),
  (6, 'East 1', 'rtsp://mediamtx:8554/east1',  21.001, 105.801, 0.7, 5, TRUE, 2, NOW(), NOW()),
  (7, 'South 1','rtsp://mediamtx:8554/south1', 21.001, 105.801, 0.7, 5, TRUE, 2, NOW(), NOW()),
  (8, 'West 1', 'rtsp://mediamtx:8554/west1',  21.001, 105.801, 0.7, 5, TRUE, 2, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "video_source" = EXCLUDED."video_source",
    "latitude" = EXCLUDED."latitude",
    "longitude" = EXCLUDED."longitude",
    "threshold" = EXCLUDED."threshold",
    "max_vehicles" = EXCLUDED."max_vehicles",
    "ai_enabled" = EXCLUDED."ai_enabled",
    "intersection_id" = EXCLUDED."intersection_id",
    "updated_at" = NOW();

-- Optional: align sequences with explicit IDs
SELECT setval(pg_get_serial_sequence('intersections','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM "intersections"), 1));
SELECT setval(pg_get_serial_sequence('cameras','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM "cameras"), 1));

COMMIT;
