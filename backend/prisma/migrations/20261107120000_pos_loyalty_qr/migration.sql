ALTER TABLE `Order`
  ADD COLUMN `loyaltyPointsUsed` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `loyaltyDiscount` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `CouponRedemption` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `couponId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `orderId` INTEGER NOT NULL,
  `storeId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CouponRedemption_orderId_key`(`orderId`),
  UNIQUE INDEX `CouponRedemption_couponId_userId_key`(`couponId`, `userId`),
  INDEX `CouponRedemption_storeId_createdAt_idx`(`storeId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PosLoyaltyToken` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `token` VARCHAR(96) NOT NULL,
  `storeId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `couponCode` VARCHAR(191) NULL,
  `pointsToUse` INTEGER NOT NULL DEFAULT 0,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `orderId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PosLoyaltyToken_token_key`(`token`),
  UNIQUE INDEX `PosLoyaltyToken_orderId_key`(`orderId`),
  INDEX `PosLoyaltyToken_storeId_expiresAt_idx`(`storeId`, `expiresAt`),
  INDEX `PosLoyaltyToken_userId_createdAt_idx`(`userId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
