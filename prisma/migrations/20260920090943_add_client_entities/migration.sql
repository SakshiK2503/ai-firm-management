-- CreateTable
CREATE TABLE "client_entities" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pan" TEXT,
    "gstin" TEXT,
    "cin" TEXT,
    "accountManagerId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_entities_organisationId_idx" ON "client_entities"("organisationId");

-- CreateIndex
CREATE INDEX "client_entities_clientId_idx" ON "client_entities"("clientId");

-- CreateIndex
CREATE INDEX "client_entities_accountManagerId_idx" ON "client_entities"("accountManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "client_entities_clientId_name_key" ON "client_entities"("clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "client_entities_organisationId_pan_key" ON "client_entities"("organisationId", "pan");

-- CreateIndex
CREATE UNIQUE INDEX "client_entities_organisationId_gstin_key" ON "client_entities"("organisationId", "gstin");

-- AddForeignKey
ALTER TABLE "client_entities" ADD CONSTRAINT "client_entities_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_entities" ADD CONSTRAINT "client_entities_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_entities" ADD CONSTRAINT "client_entities_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
