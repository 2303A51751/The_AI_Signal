-- prisma/migrations/0001_initial/migration.sql
-- Initial schema migration. Generated from schema.prisma.
-- Run `npm run db:migrate` to apply, or `npm run db:push` for prototyping.

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configurations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "rawSchema" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "entity" TEXT,
    "payload" JSONB,
    "actions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_configurations_userId_slug_key" ON "app_configurations"("userId", "slug");

-- CreateIndex
CREATE INDEX "app_configurations_userId_idx" ON "app_configurations"("userId");

-- CreateIndex
CREATE INDEX "dynamic_data_appId_entity_idx" ON "dynamic_data"("appId", "entity");

-- CreateIndex
CREATE INDEX "dynamic_data_userId_idx" ON "dynamic_data"("userId");

-- CreateIndex
CREATE INDEX "workflow_logs_appId_idx" ON "workflow_logs"("appId");

-- AddForeignKey
ALTER TABLE "app_configurations" ADD CONSTRAINT "app_configurations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_data" ADD CONSTRAINT "dynamic_data_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_data" ADD CONSTRAINT "dynamic_data_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "app_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_logs" ADD CONSTRAINT "workflow_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_logs" ADD CONSTRAINT "workflow_logs_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "app_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
