-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_organisationId_idx" ON "contacts"("organisationId");

-- CreateIndex
CREATE INDEX "contacts_entityId_idx" ON "contacts"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_entityId_name_key" ON "contacts"("entityId", "name");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "client_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
