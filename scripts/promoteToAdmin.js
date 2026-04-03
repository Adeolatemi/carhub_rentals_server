const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node promoteToAdmin.js <email>');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  await prisma.user.update({ where: { email }, data: { role: 'SUPERADMIN', isActive: true } });
  console.log('Promoted', email, 'to SUPERADMIN');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
