-- AlterTable
ALTER TABLE `Address` ADD COLUMN `lat` DOUBLE NULL,
    ADD COLUMN `lng` DOUBLE NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `dropoffLat` DOUBLE NULL,
    ADD COLUMN `dropoffLng` DOUBLE NULL;

-- AlterTable
ALTER TABLE `Store` ADD COLUMN `lat` DOUBLE NULL,
    ADD COLUMN `lng` DOUBLE NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER', 'SHIPPER') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `ShipperProfile` (
    `userId` INTEGER NOT NULL,
    `vehicleType` VARCHAR(191) NOT NULL DEFAULT 'XE_MAY',
    `plateNumber` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `locationAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delivery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `storeId` INTEGER NOT NULL,
    `shipperId` INTEGER NULL,
    `status` ENUM('WAITING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `fee` INTEGER NOT NULL DEFAULT 0,
    `codAmount` INTEGER NOT NULL DEFAULT 0,
    `distanceKm` DOUBLE NULL,
    `pickupAddress` TEXT NOT NULL,
    `pickupLat` DOUBLE NULL,
    `pickupLng` DOUBLE NULL,
    `dropoffAddress` TEXT NOT NULL,
    `dropoffLat` DOUBLE NULL,
    `dropoffLng` DOUBLE NULL,
    `shipperLat` DOUBLE NULL,
    `shipperLng` DOUBLE NULL,
    `shipperLocAt` DATETIME(3) NULL,
    `failReason` TEXT NULL,
    `assignedAt` DATETIME(3) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Delivery_orderId_key`(`orderId`),
    INDEX `Delivery_status_idx`(`status`),
    INDEX `Delivery_shipperId_status_idx`(`shipperId`, `status`),
    INDEX `Delivery_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ShipperProfile` ADD CONSTRAINT `ShipperProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_shipperId_fkey` FOREIGN KEY (`shipperId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
