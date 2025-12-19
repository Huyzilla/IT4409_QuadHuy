-- CreateTable
CREATE TABLE "cameras" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "video_source" VARCHAR(500) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traffic_frame_stats" (
    "id" SERIAL NOT NULL,
    "camera_id" INTEGER NOT NULL,
    "vehicles" INTEGER NOT NULL,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "captured_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traffic_frame_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traffic_signal_logs" (
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

-- CreateTable
CREATE TABLE "intersections" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intersections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traffic_frame_stats_camera_id_idx" ON "traffic_frame_stats"("camera_id");

-- CreateIndex
CREATE INDEX "traffic_frame_stats_captured_at_idx" ON "traffic_frame_stats"("captured_at");

-- CreateIndex
CREATE INDEX "traffic_signal_logs_timestamp_idx" ON "traffic_signal_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "traffic_frame_stats" ADD CONSTRAINT "traffic_frame_stats_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
