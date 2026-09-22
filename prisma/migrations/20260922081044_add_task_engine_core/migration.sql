-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NEW', 'AI_PROCESSING', 'AWAITING_ALLOCATION', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CLIENT_INFO', 'AWAITING_INTERNAL_DEPENDENCY', 'SUBMITTED_FOR_REVIEW', 'REVIEW_IN_PROGRESS', 'CORRECTION_REQUIRED', 'APPROVED', 'CLIENT_DELIVERY', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientEntityId" TEXT NOT NULL,
    "departmentId" TEXT,
    "serviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_sequences" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "task_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_organisationId_idx" ON "tasks"("organisationId");

-- CreateIndex
CREATE INDEX "tasks_clientId_idx" ON "tasks"("clientId");

-- CreateIndex
CREATE INDEX "tasks_clientEntityId_idx" ON "tasks"("clientEntityId");

-- CreateIndex
CREATE INDEX "tasks_serviceId_idx" ON "tasks"("serviceId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_organisationId_taskNumber_key" ON "tasks"("organisationId", "taskNumber");

-- CreateIndex
CREATE UNIQUE INDEX "task_sequences_organisationId_yearMonth_key" ON "task_sequences"("organisationId", "yearMonth");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientEntityId_fkey" FOREIGN KEY ("clientEntityId") REFERENCES "client_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_sequences" ADD CONSTRAINT "task_sequences_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
