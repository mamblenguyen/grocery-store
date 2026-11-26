ALTER TABLE `InventoryLog` MODIFY `reason` ENUM('IMPORT', 'EXPORT', 'STOCKTAKE', 'ORDER', 'CANCEL', 'RETURN', 'ADJUST') NOT NULL;
ALTER TABLE `Order` ADD COLUMN `promotionData` JSON NULL;

CREATE TABLE `AuditLog` (
  `id` BIGINT NOT NULL AUTO_INCREMENT, `storeId` INTEGER NULL, `userId` INTEGER NULL, `userEmail` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL, `entity` VARCHAR(191) NOT NULL, `entityId` VARCHAR(191) NULL, `method` VARCHAR(191) NULL,
  `path` VARCHAR(191) NULL, `ip` VARCHAR(191) NULL, `userAgent` VARCHAR(500) NULL, `beforeData` JSON NULL, `afterData` JSON NULL,
  `metadata` JSON NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `AuditLog_storeId_createdAt_idx` ON `AuditLog`(`storeId`, `createdAt`);
CREATE INDEX `AuditLog_userId_createdAt_idx` ON `AuditLog`(`userId`, `createdAt`);
CREATE INDEX `AuditLog_entity_entityId_idx` ON `AuditLog`(`entity`, `entityId`);

CREATE TABLE `ReturnRequest` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `code` VARCHAR(191) NOT NULL, `storeId` INTEGER NOT NULL, `orderId` INTEGER NOT NULL,
  `userId` INTEGER NULL, `type` VARCHAR(191) NOT NULL DEFAULT 'RETURN', `status` VARCHAR(191) NOT NULL DEFAULT 'REQUESTED',
  `reason` VARCHAR(191) NOT NULL, `customerNote` TEXT NULL, `adminNote` TEXT NULL, `evidence` JSON NULL, `items` JSON NOT NULL,
  `requestedAmount` INTEGER NOT NULL DEFAULT 0, `approvedAmount` INTEGER NULL, `refundMethod` VARCHAR(191) NULL,
  `refundRef` VARCHAR(191) NULL, `resolution` TEXT NULL, `reviewedById` INTEGER NULL, `reviewedAt` DATETIME(3) NULL,
  `receivedAt` DATETIME(3) NULL, `refundedAt` DATETIME(3) NULL, `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ReturnRequest_code_key`(`code`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ReturnRequest_storeId_status_createdAt_idx` ON `ReturnRequest`(`storeId`, `status`, `createdAt`);
CREATE INDEX `ReturnRequest_orderId_idx` ON `ReturnRequest`(`orderId`);
CREATE INDEX `ReturnRequest_userId_createdAt_idx` ON `ReturnRequest`(`userId`, `createdAt`);

CREATE TABLE `Reconciliation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `code` VARCHAR(191) NOT NULL, `storeId` INTEGER NOT NULL, `type` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT', `periodFrom` DATETIME(3) NOT NULL, `periodTo` DATETIME(3) NOT NULL,
  `expectedAmount` INTEGER NOT NULL DEFAULT 0, `actualAmount` INTEGER NOT NULL DEFAULT 0, `difference` INTEGER NOT NULL DEFAULT 0,
  `itemCount` INTEGER NOT NULL DEFAULT 0, `details` JSON NULL, `note` TEXT NULL, `createdById` INTEGER NULL,
  `confirmedById` INTEGER NULL, `confirmedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, UNIQUE INDEX `Reconciliation_code_key`(`code`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `Reconciliation_storeId_type_periodFrom_idx` ON `Reconciliation`(`storeId`, `type`, `periodFrom`);
CREATE INDEX `Reconciliation_status_idx` ON `Reconciliation`(`status`);

CREATE TABLE `LoyaltyAccount` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `storeId` INTEGER NOT NULL, `userId` INTEGER NOT NULL, `points` INTEGER NOT NULL DEFAULT 0,
  `lifetimePoints` INTEGER NOT NULL DEFAULT 0, `tier` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LoyaltyAccount_storeId_userId_key`(`storeId`, `userId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `LoyaltyAccount_storeId_tier_idx` ON `LoyaltyAccount`(`storeId`, `tier`);

CREATE TABLE `LoyaltyTransaction` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `storeId` INTEGER NOT NULL, `userId` INTEGER NOT NULL, `orderId` INTEGER NULL,
  `type` VARCHAR(191) NOT NULL, `points` INTEGER NOT NULL, `balance` INTEGER NOT NULL, `note` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `LoyaltyTransaction_storeId_userId_createdAt_idx` ON `LoyaltyTransaction`(`storeId`, `userId`, `createdAt`);
CREATE INDEX `LoyaltyTransaction_orderId_idx` ON `LoyaltyTransaction`(`orderId`);

CREATE TABLE `Promotion` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `storeId` INTEGER NOT NULL, `code` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL, `type` VARCHAR(191) NOT NULL, `priority` INTEGER NOT NULL DEFAULT 0, `rules` JSON NOT NULL,
  `actions` JSON NOT NULL, `stackable` BOOLEAN NOT NULL DEFAULT false, `usageLimit` INTEGER NULL, `usedCount` INTEGER NOT NULL DEFAULT 0,
  `startsAt` DATETIME(3) NULL, `endsAt` DATETIME(3) NULL, `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Promotion_storeId_code_key`(`storeId`, `code`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `Promotion_storeId_isActive_startsAt_endsAt_idx` ON `Promotion`(`storeId`, `isActive`, `startsAt`, `endsAt`);

CREATE TABLE `CustomerSegment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `storeId` INTEGER NOT NULL, `name` VARCHAR(191) NOT NULL, `description` TEXT NULL,
  `rules` JSON NOT NULL, `isDynamic` BOOLEAN NOT NULL DEFAULT true, `memberCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `CustomerSegment_storeId_idx` ON `CustomerSegment`(`storeId`);

CREATE TABLE `MarketingCampaign` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `storeId` INTEGER NOT NULL, `segmentId` INTEGER NULL, `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL, `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT', `triggerType` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
  `triggerData` JSON NULL, `subject` VARCHAR(191) NULL, `content` TEXT NOT NULL, `couponCode` VARCHAR(191) NULL,
  `scheduledAt` DATETIME(3) NULL, `sentAt` DATETIME(3) NULL, `totalCount` INTEGER NOT NULL DEFAULT 0,
  `sentCount` INTEGER NOT NULL DEFAULT 0, `failedCount` INTEGER NOT NULL DEFAULT 0, `createdById` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `MarketingCampaign_storeId_status_scheduledAt_idx` ON `MarketingCampaign`(`storeId`, `status`, `scheduledAt`);
CREATE INDEX `MarketingCampaign_segmentId_idx` ON `MarketingCampaign`(`segmentId`);
