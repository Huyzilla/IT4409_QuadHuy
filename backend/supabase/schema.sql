-- Generated from Prisma schema via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
-- Target: PostgreSQL (Supabase)

BEGIN;

CREATE TABLE IF NOT EXISTS "cameras" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "video_source" VARCHAR(500) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_vehicles" INTEGER NOT NULL DEFAULT 5,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "intersectionId" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "traffic_frame_stats" (
    "id" SERIAL NOT NULL,
    "camera_id" INTEGER NOT NULL,
    "vehicles" INTEGER NOT NULL,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "captured_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traffic_frame_stats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "traffic_signal_logs" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "readable_time" VARCHAR(100) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "green_road_id" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "traffic_status" JSONB NOT NULL,
    "cycle_queue" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_signal_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "intersections" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intersections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "traffic_minute_summaries" (
    "id" SERIAL NOT NULL,
    "camera_id" INTEGER NOT NULL,
    "minute_start" INTEGER NOT NULL,
    "minute_end" INTEGER NOT NULL,
    "vehicles_avg" DOUBLE PRECISION NOT NULL,
    "vehicles_max" INTEGER NOT NULL,
    "samples" INTEGER NOT NULL,
    "flow_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_minute_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "role_id" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "traffic_frame_stats_camera_id_idx" ON "traffic_frame_stats"("camera_id");
CREATE INDEX IF NOT EXISTS "traffic_frame_stats_captured_at_idx" ON "traffic_frame_stats"("captured_at");
CREATE INDEX IF NOT EXISTS "traffic_signal_logs_timestamp_idx" ON "traffic_signal_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "traffic_minute_summaries_minute_start_idx" ON "traffic_minute_summaries"("minute_start");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'traffic_minute_summaries_camera_id_minute_start_key'
  ) THEN
    CREATE UNIQUE INDEX "traffic_minute_summaries_camera_id_minute_start_key" ON "traffic_minute_summaries"("camera_id", "minute_start");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_username_key'
  ) THEN
    CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_email_key'
  ) THEN
    CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'cameras_intersectionId_fkey'
      AND table_name = 'cameras'
  ) THEN
    ALTER TABLE "cameras" ADD CONSTRAINT "cameras_intersectionId_fkey"
      FOREIGN KEY ("intersectionId") REFERENCES "intersections"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'traffic_frame_stats_camera_id_fkey'
      AND table_name = 'traffic_frame_stats'
  ) THEN
    ALTER TABLE "traffic_frame_stats" ADD CONSTRAINT "traffic_frame_stats_camera_id_fkey"
      FOREIGN KEY ("camera_id") REFERENCES "cameras"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'traffic_minute_summaries_camera_id_fkey'
      AND table_name = 'traffic_minute_summaries'
  ) THEN
    ALTER TABLE "traffic_minute_summaries" ADD CONSTRAINT "traffic_minute_summaries_camera_id_fkey"
      FOREIGN KEY ("camera_id") REFERENCES "cameras"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
