require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ username: 'admin' }, { email: 'admin@traffic.ai' }],
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
      },
    });

    console.log('admin matches:', users);
    console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
    console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
