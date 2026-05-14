// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Check if Super Admin exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@carhub.com',
        password: hashedPassword,
        role: 'SUPERADMIN',
        isActive: true,
      }
    });
    
    console.log('✅ Super Admin created!');
    console.log('📧 Email: admin@carhub.com');
    console.log('🔑 Password: Admin123!');
  } else {
    console.log('ℹ️ Super Admin already exists');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());