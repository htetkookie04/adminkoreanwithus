import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed roles (if they don't exist)
  const roles = [
    { id: 1, name: 'super_admin', description: 'Full system access, manage roles & settings' },
    { id: 2, name: 'admin', description: 'Manage users, courses, enrollments, view analytics' },
    { id: 3, name: 'course_manager', description: 'Manage course content, schedule, see own class students' },
    { id: 4, name: 'teacher', description: 'Manage course content, schedule, see own class students' },
    { id: 5, name: 'support', description: 'Handle inquiries and enrollments, limited student data access' },
    { id: 6, name: 'sales', description: 'Handle inquiries and enrollments, limited student data access' },
    { id: 7, name: 'viewer', description: 'Read-only access to analytics and logs' },
    { id: 8, name: 'user', description: 'Regular user/student role' }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role
    });
  }

  console.log('✅ Roles seeded');

  // Seed default admin user (if doesn't exist)
  const adminEmail = 'admin@koreanwithus.com';
  const adminPassword = 'admin123'; // ⚠️ Change in production!

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+65-1234-5678',
        roleId: 1, // super_admin
        status: 'active'
      }
    });

    console.log('✅ Default admin user created');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

