-- AlterTable
ALTER TABLE `PartnerApplication` ADD COLUMN `addons` JSON NULL;

-- CreateTable
CREATE TABLE `AddonPack` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `kind` VARCHAR(30) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `months` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AddonPack_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorePurchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `storeId` INTEGER NOT NULL,
    `type` ENUM('ADDON', 'PLAN') NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `name` VARCHAR(191) NOT NULL,
    `packId` INTEGER NULL,
    `kind` VARCHAR(30) NULL,
    `units` INTEGER NOT NULL DEFAULT 1,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `planId` INTEGER NULL,
    `months` INTEGER NOT NULL DEFAULT 1,
    `amount` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `paymentRef` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `source` VARCHAR(20) NOT NULL DEFAULT 'SELF',
    `requestedById` INTEGER NULL,
    `confirmedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StorePurchase_code_key`(`code`),
    INDEX `StorePurchase_storeId_status_idx`(`storeId`, `status`),
    INDEX `StorePurchase_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StorePurchase` ADD CONSTRAINT `StorePurchase_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StorePurchase` ADD CONSTRAINT `StorePurchase_packId_fkey` FOREIGN KEY (`packId`) REFERENCES `AddonPack`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StorePurchase` ADD CONSTRAINT `StorePurchase_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Gói Miễn phí mặc định (đối tác mới được gán gói này nếu không chọn gói khác)
INSERT IGNORE INTO `Plan` (`code`, `name`, `description`, `priceMonthly`, `maxProducts`, `maxStaff`, `features`, `maxOrdersMonthly`, `maxCampaignsMonthly`, `auditRetentionDays`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES ('free', 'Miễn phí', 'Gói mặc định cho đối tác mới – không thời hạn, có thể mua thêm hạn mức hoặc nâng cấp bất cứ lúc nào', 0, 30, 1, '["COUPONS"]', 100, NULL, NULL, true, 1, NOW(3), NOW(3));

-- Gói mua thêm mẫu (giá đã gồm thuế; super admin chỉnh tại /super/addons)
INSERT IGNORE INTO `AddonPack` (`code`, `name`, `description`, `kind`, `quantity`, `price`, `months`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('them-30-san-pham', 'Thêm 30 sản phẩm', 'Mở rộng danh mục hàng hoá, dùng không thời hạn', 'products', 30, 150000, 0, true, 1, NOW(3), NOW(3)),
('them-100-san-pham', 'Thêm 100 sản phẩm', 'Tiết kiệm 35% so với mua lẻ gói 30 sản phẩm', 'products', 100, 390000, 0, true, 2, NOW(3), NOW(3)),
('them-500-san-pham', 'Thêm 500 sản phẩm', 'Cho cửa hàng mở rộng ngành hàng lớn', 'products', 500, 1490000, 0, true, 3, NOW(3), NOW(3)),
('them-200-don-hang', 'Thêm 200 đơn hàng/tháng', 'Cộng thêm 200 đơn mỗi tháng trong 1 tháng', 'ordersMonthly', 200, 99000, 1, true, 10, NOW(3), NOW(3)),
('them-1000-don-hang', 'Thêm 1.000 đơn hàng/tháng', 'Cho mùa cao điểm, lễ Tết', 'ordersMonthly', 1000, 390000, 1, true, 11, NOW(3), NOW(3)),
('them-1-nhan-vien', 'Thêm 1 tài khoản nhân viên', 'Thêm 1 nhân viên bán hàng / kho trong 1 tháng', 'staff', 1, 49000, 1, true, 20, NOW(3), NOW(3)),
('them-5-nhan-vien', 'Thêm 5 tài khoản nhân viên', 'Thêm 5 nhân viên trong 1 tháng', 'staff', 5, 199000, 1, true, 21, NOW(3), NOW(3)),
('them-5-chien-dich', 'Thêm 5 chiến dịch marketing/tháng', 'Gửi thêm 5 chiến dịch khuyến mãi mỗi tháng trong 1 tháng', 'campaignsMonthly', 5, 99000, 1, true, 30, NOW(3), NOW(3));
