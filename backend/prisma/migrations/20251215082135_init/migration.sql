-- AlterTable
ALTER TABLE "cameras" ADD COLUMN     "intersectionId" INTEGER;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_intersectionId_fkey" FOREIGN KEY ("intersectionId") REFERENCES "intersections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
