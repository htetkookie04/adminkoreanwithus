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

  // Seed default finance categories (create if not exist by type+name)
  const revenueCategories = ['Student Payments', 'Book Sales', 'Other Revenue'];
  const expenseCategories = ['Purchases', 'Payroll', 'Operations', 'Other Expense'];

  for (const name of revenueCategories) {
    const existing = await prisma.financeCategory.findFirst({ where: { type: 'REVENUE', name } });
    if (!existing) {
      await prisma.financeCategory.create({ data: { type: 'REVENUE', name, isActive: true } });
    }
  }
  for (const name of expenseCategories) {
    const existing = await prisma.financeCategory.findFirst({ where: { type: 'EXPENSE', name } });
    if (!existing) {
      await prisma.financeCategory.create({ data: { type: 'EXPENSE', name, isActive: true } });
    }
  }
  console.log('✅ Finance categories seeded');

  // Seed Finance menu for Super Admin (1) and Admin (2) so it appears in sidebar
  for (const roleId of [1, 2]) {
    await prisma.roleMenuPermission.upsert({
      where: {
        roleId_menuKey: { roleId, menuKey: 'finance' }
      },
      update: {
        menuLabel: 'Finance',
        menuPath: '/finance/revenue',
        menuIcon: 'DollarSign',
        sortOrder: 7,
        enabled: true
      },
      create: {
        roleId,
        menuKey: 'finance',
        menuLabel: 'Finance',
        menuPath: '/finance/revenue',
        menuIcon: 'DollarSign',
        sortOrder: 7,
        enabled: true
      }
    });
  }
  console.log('✅ Finance menu seeded for admin roles');

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

