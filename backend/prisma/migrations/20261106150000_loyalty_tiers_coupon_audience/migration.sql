ALTER TABLE `Coupon` ADD COLUMN `audienceAll` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `CouponRecipient` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `couponId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CouponRecipient_couponId_userId_key`(`couponId`, `userId`),
  INDEX `CouponRecipient_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CouponRecipient`
  ADD CONSTRAINT `CouponRecipient_couponId_fkey`
  FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CouponRecipient`
  ADD CONSTRAINT `CouponRecipient_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `LoyaltyTierSetting` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `storeId` INTEGER NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `minSpend` INTEGER NOT NULL DEFAULT 0,
  `benefits` JSON NOT NULL,
  `rewardCouponCode` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LoyaltyTierSetting_storeId_key_key`(`storeId`, `key`),
  INDEX `LoyaltyTierSetting_storeId_minSpend_idx`(`storeId`, `minSpend`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `LoyaltyTierSetting`
  (`storeId`, `key`, `name`, `minSpend`, `benefits`, `sortOrder`, `updatedAt`)
SELECT `id`, 'BRONZE', 'Đồng', 0, JSON_ARRAY(), 1, CURRENT_TIMESTAMP(3) FROM `Store`
UNION ALL
SELECT `id`, 'SILVER', 'Bạc', 2000000, JSON_ARRAY(), 2, CURRENT_TIMESTAMP(3) FROM `Store`
UNION ALL
SELECT `id`, 'GOLD', 'Vàng', 5000000, JSON_ARRAY(), 3, CURRENT_TIMESTAMP(3) FROM `Store`
UNION ALL
SELECT `id`, 'DIAMOND', 'Kim cương', 10000000, JSON_ARRAY(), 4, CURRENT_TIMESTAMP(3) FROM `Store`;
