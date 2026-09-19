-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_organisationId_idx" ON "clients"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organisationId_name_key" ON "clients"("organisationId", "name");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
