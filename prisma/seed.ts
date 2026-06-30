import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // 默认管理员账号
  const defaultAdmin = {
    email: 'admin@autosign.com',
    password: 'admin123',
    name: '管理员',
  };

  // 检查是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email: defaultAdmin.email },
  });

  if (existingUser) {
    console.log('默认管理员账号已存在，跳过创建');
  } else {
    // 创建管理员账号
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 12);

    await prisma.user.create({
      data: {
        email: defaultAdmin.email,
        password: hashedPassword,
        name: defaultAdmin.name,
        role: 'ADMIN',
      },
    });

    console.log('✅ 默认管理员账号创建成功！');
    console.log(`📧 邮箱: ${defaultAdmin.email}`);
    console.log(`🔑 密码: ${defaultAdmin.password}`);
    console.log('⚠️  请登录后立即修改密码！');
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('种子脚本执行失败:', e);
    process.exit(1);
  });
