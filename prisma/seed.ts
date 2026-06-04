// prisma/seed.ts
// Run with: npm run db:seed

import { PrismaClient } from '@prisma/client';
import { EXAMPLE_CONFIG } from '../src/lib/runtime/example-config';
import { repairAppConfig } from '../src/lib/runtime/config-repair';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@metaruntime.dev' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@metaruntime.dev',
      name: 'Demo User',
    },
  });

  console.log(`✓ User: ${user.email}`);

  // Create example app
  const { config } = repairAppConfig(EXAMPLE_CONFIG);

  const app = await prisma.appConfiguration.upsert({
    where: { userId_slug: { userId: user.id, slug: 'sales-crm' } },
    update: { schema: config as any, rawSchema: EXAMPLE_CONFIG as any },
    create: {
      userId: user.id,
      name: 'Sales CRM',
      slug: 'sales-crm',
      description: 'A metadata-driven CRM application',
      schema: config as any,
      rawSchema: EXAMPLE_CONFIG as any,
      isPublished: true,
    },
  });

  console.log(`✓ App: ${app.name} (id: ${app.id})`);

  // Seed a few records
  await prisma.dynamicData.createMany({
    data: [
      {
        userId: user.id, appId: app.id, entity: 'employees',
        data: { name: 'Alice Chen', email: 'alice@example.com', department: 'engineering', salary: 120000, active: true },
      },
      {
        userId: user.id, appId: app.id, entity: 'employees',
        data: { name: 'Bob Kumar', email: 'bob@example.com', department: 'sales', salary: 85000, active: true },
      },
      {
        userId: user.id, appId: app.id, entity: 'deals',
        data: { title: 'Enterprise Subscription', company: 'Acme Corp', value: 50000, stage: 'proposal' },
      },
      {
        userId: user.id, appId: app.id, entity: 'deals',
        data: { title: 'SMB Onboarding', company: 'StartupXYZ', value: 12000, stage: 'negotiation' },
      },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Seeded sample employees and deals');
  console.log('\n🚀 Done! Visit http://localhost:3000/dashboard to start.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
