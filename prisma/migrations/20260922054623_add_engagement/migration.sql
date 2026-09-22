-- CreateEnum
CREATE TYPE "BillingStructure" AS ENUM ('MONTHLY', 'ASSIGNMENT');

-- CreateTable
CREATE TABLE "engagements" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "clientEntityId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "engagementStart" TIMESTAMP(3) NOT NULL,
    "billingStructure" "BillingStructure" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engagements_organisationId_idx" ON "engagements"("organisationId");

-- CreateIndex
CREATE INDEX "engagements_clientEntityId_idx" ON "engagements"("clientEntityId");

-- CreateIndex
CREATE INDEX "engagements_serviceId_idx" ON "engagements"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "engagements_clientEntityId_serviceId_key" ON "engagements"("clientEntityId", "serviceId");

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_clientEntityId_fkey" FOREIGN KEY ("clientEntityId") REFERENCES "client_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
