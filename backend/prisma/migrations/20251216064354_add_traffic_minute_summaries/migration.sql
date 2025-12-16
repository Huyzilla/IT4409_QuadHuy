-- CreateTable
CREATE TABLE "traffic_minute_summaries" (
    "id" SERIAL NOT NULL,
    "camera_id" INTEGER NOT NULL,
    "minute_start" INTEGER NOT NULL,
    "minute_end" INTEGER NOT NULL,
    "vehicles_avg" DOUBLE PRECISION NOT NULL,
    "vehicles_max" INTEGER NOT NULL,
    "samples" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_minute_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traffic_minute_summaries_minute_start_idx" ON "traffic_minute_summaries"("minute_start");

-- CreateIndex
CREATE UNIQUE INDEX "traffic_minute_summaries_camera_id_minute_start_key" ON "traffic_minute_summaries"("camera_id", "minute_start");

-- AddForeignKey
ALTER TABLE "traffic_minute_summaries" ADD CONSTRAINT "traffic_minute_summaries_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
