-- =====================================================================
-- Chuyển sang mô hình nhiều cửa hàng (multi-tenant)
-- An toàn với DB đang có dữ liệu: toàn bộ dữ liệu cũ được gán vào
-- cửa hàng mặc định (id = 1) với gói "Không giới hạn", không hết hạn.
-- =====================================================================

-- 1. Bảng gói dịch vụ, cửa hàng, thanh toán gói
CREATE TABLE `Plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `priceMonthly` INTEGER NOT NULL DEFAULT 0,
    `maxProducts` INTEGER NULL,
    `maxStaff` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Plan_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Store` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `logo` VARCHAR(1000) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `planId` INTEGER NULL,
    `planExpiresAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Store_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StorePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `planId` INTEGER NULL,
    `months` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `periodFrom` DATETIME(3) NOT NULL,
    `periodTo` DATETIME(3) NOT NULL,
    `method` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `StorePayment_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Gói mặc định + cửa hàng mặc định cho dữ liệu cũ
INSERT INTO `Plan` (`id`, `code`, `name`, `description`, `priceMonthly`, `maxProducts`, `maxStaff`, `sortOrder`, `updatedAt`)
VALUES (1, 'unlimited', 'Không giới hạn', 'Gói nội bộ, không giới hạn sản phẩm / nhân viên', 0, NULL, NULL, 99, CURRENT_TIMESTAMP(3));

INSERT INTO `Store` (`id`, `slug`, `name`, `status`, `planId`, `planExpiresAt`, `note`, `updatedAt`)
VALUES (
  1, 'cua-hang-chinh',
  COALESCE((SELECT JSON_UNQUOTE(JSON_EXTRACT(`value`, '$.storeName')) FROM `Setting` WHERE `key` = 'store' LIMIT 1), 'Cửa hàng chính'),
  'ACTIVE', 1, NULL, 'Tạo tự động khi nâng cấp lên nhiều cửa hàng', CURRENT_TIMESTAMP(3)
);

-- 3. Bỏ ràng buộc duy nhất toàn cục (sẽ thay bằng duy nhất theo cửa hàng)
DROP INDEX `Category_slug_key` ON `Category`;
DROP INDEX `Coupon_code_key` ON `Coupon`;
DROP INDEX `Product_slug_key` ON `Product`;
DROP INDEX `ProductVariant_sku_key` ON `ProductVariant`;
DROP INDEX `StockDocument_code_key` ON `StockDocument`;

-- 4. Thêm storeId (dữ liệu cũ → cửa hàng 1), sau đó bỏ giá trị mặc định
ALTER TABLE `Category` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Coupon` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Order` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Product` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `ProductVariant` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `StockDocument` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Supplier` ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Setting` DROP PRIMARY KEY, ADD COLUMN `storeId` INTEGER NOT NULL DEFAULT 1, ADD PRIMARY KEY (`storeId`, `key`);

ALTER TABLE `Category` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `Coupon` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `Order` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `Product` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `ProductVariant` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `StockDocument` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `Supplier` ALTER COLUMN `storeId` DROP DEFAULT;
ALTER TABLE `Setting` ALTER COLUMN `storeId` DROP DEFAULT;

-- 5. Người dùng: thêm SUPER_ADMIN; ADMIN/STAFF hiện có thuộc cửa hàng 1
ALTER TABLE `User` ADD COLUMN `storeId` INTEGER NULL,
    MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER';
UPDATE `User` SET `storeId` = 1 WHERE `role` IN ('ADMIN', 'STAFF');

-- 6. Ràng buộc & chỉ mục mới
CREATE UNIQUE INDEX `Category_storeId_slug_key` ON `Category`(`storeId`, `slug`);
CREATE UNIQUE INDEX `Coupon_storeId_code_key` ON `Coupon`(`storeId`, `code`);
CREATE INDEX `Order_storeId_createdAt_idx` ON `Order`(`storeId`, `createdAt`);
CREATE UNIQUE INDEX `Product_storeId_slug_key` ON `Product`(`storeId`, `slug`);
CREATE INDEX `ProductVariant_storeId_barcode_idx` ON `ProductVariant`(`storeId`, `barcode`);
CREATE UNIQUE INDEX `ProductVariant_storeId_sku_key` ON `ProductVariant`(`storeId`, `sku`);
CREATE UNIQUE INDEX `StockDocument_storeId_code_key` ON `StockDocument`(`storeId`, `code`);
CREATE INDEX `Supplier_storeId_idx` ON `Supplier`(`storeId`);
CREATE INDEX `User_storeId_idx` ON `User`(`storeId`);

ALTER TABLE `User` ADD CONSTRAINT `User_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Category` ADD CONSTRAINT `Category_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StockDocument` ADD CONSTRAINT `StockDocument_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Store` ADD CONSTRAINT `Store_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StorePayment` ADD CONSTRAINT `StorePayment_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StorePayment` ADD CONSTRAINT `StorePayment_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StorePayment` ADD CONSTRAINT `StorePayment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
