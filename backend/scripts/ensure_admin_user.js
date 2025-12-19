require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        fullName: 'Quản trị viên Hệ thống',
        email: 'admin@traffic.ai',
        password: hashedPassword,
      },
      create: {
        username: 'admin',
        fullName: 'Quản trị viên Hệ thống',
        email: 'admin@traffic.ai',
        password: hashedPassword,
      },
      select: { id: true, username: true, email: true, fullName: true },
    });

    console.log('Ensured admin user:', user);
    console.log('Admin password is now set to:', password);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
