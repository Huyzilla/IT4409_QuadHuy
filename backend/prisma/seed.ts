import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Đang dọn dẹp dữ liệu cũ...');
  await prisma.trafficFrameStat.deleteMany();
  await prisma.camera.deleteMany();
  await prisma.intersection.deleteMany();
  await prisma.trafficSignalLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('Đang tạo User Admin...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      username: 'admin',
      fullName: 'Quản trị viên Hệ thống',
      email: 'admin@traffic.ai',
      password: hashedPassword,
    }
  });

  const locations = [
    { name: "Ngã tư Chùa Bộc - Phạm Ngọc Thạch", lat: 21.0074, lng: 105.8288, area: "Đống Đa" },
    { name: "Ngã tư Nguyễn Chí Thanh - Láng", lat: 21.0234, lng: 105.8061, area: "Đống Đa" },
    { name: "Ngã tư Xuân Thủy - Trần Thái Tông", lat: 21.0366, lng: 105.7831, area: "Cầu Giấy" },
    { name: "Ngã tư Giải Phóng - Đại Cồ Việt", lat: 21.0063, lng: 105.8427, area: "Hai Bà Trưng" }
  ];

  console.log('Đang tạo 4 Ngã tư & 16 Camera...');
  const directions = ["North", "South", "East", "West"];
  const now = new Date();

  for (const loc of locations) {
    const intersection = await prisma.intersection.create({
      data: {
        name: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        description: `Khu vực trọng điểm quận ${loc.area}`,
      },
    });

    for (const dir of directions) {
      const camera = await prisma.camera.create({
        data: {
          name: `${dir} - ${loc.name}`,
          videoSource: `rtsp://localhost:8554/${loc.area.toLowerCase()}-${dir.toLowerCase()}`,
          latitude: loc.lat,
          longitude: loc.lng,
          intersectionId: intersection.id,
        },
      });

      const frameStats = Array.from({ length: 10 }).map((_, i) => ({
        cameraId: camera.id,
        vehicles: Math.floor(Math.random() * 40) + 5,
        isEmergency: Math.random() > 0.98,
        capturedAt: new Date(now.getTime() - i * 10 * 60000),
      }));
      await prisma.trafficFrameStat.createMany({ data: frameStats });
    }

    const signalLogs = Array.from({ length: 5 }).map((_, i) => ({
      timestamp: BigInt(Math.floor((now.getTime() - i * 300000) / 1000)),
      readableTime: new Date(now.getTime() - i * 300000).toISOString(),
      event: "signal_change",
      greenRoadId: (i % 4) + 1,
      duration: 30,
      reason: "NORMAL_ADAPTIVE",
      trafficStatus: { "flow": "stable" },
      cycleQueue: { "next": directions[(i + 1) % 4] }
    }));
    await prisma.trafficSignalLog.createMany({ data: signalLogs });
  }

  console.log('Đã seed thành công: 4 Ngã tư, 16 Camera, 160 FrameStats và 20 SignalLogs!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });