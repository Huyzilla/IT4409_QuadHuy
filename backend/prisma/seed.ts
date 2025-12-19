import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const intersection = await prisma.intersection.create({
    data: {
      name: "Intersection 1",
      latitude: 21.0,
      longitude: 105.8,
      description: "seed",
    },
  });

  await prisma.camera.createMany({
    data: [
      { name: "North", videoSource: "rtsp://mediamtx:8554/north", latitude: 21.0, longitude: 105.8, intersectionId: intersection.id },
      { name: "East",  videoSource: "rtsp://mediamtx:8554/east",  latitude: 21.0, longitude: 105.8, intersectionId: intersection.id },
      { name: "South", videoSource: "rtsp://mediamtx:8554/south", latitude: 21.0, longitude: 105.8, intersectionId: intersection.id },
      { name: "West",  videoSource: "rtsp://mediamtx:8554/west",  latitude: 21.0, longitude: 105.8, intersectionId: intersection.id },
    ],
  });
}

main()
  .finally(async () => prisma.$disconnect());
