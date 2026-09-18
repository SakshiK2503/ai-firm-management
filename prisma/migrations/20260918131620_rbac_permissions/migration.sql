-- CreateTable
CREATE TABLE "permissions" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_permissions_organisationId_idx" ON "role_permissions"("organisationId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionKey_idx" ON "role_permissions"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionKey_key" ON "role_permissions"("roleId", "permissionKey");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "permissions"("key") ON DELETE CASCADE ON UPDATE CASCADE;
