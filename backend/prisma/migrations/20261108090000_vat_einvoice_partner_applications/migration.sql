-- AlterTable
ALTER TABLE `Product` ADD COLUMN `vatRate` VARCHAR(8) NULL;

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `unit` VARCHAR(50) NULL,
    ADD COLUMN `vatRate` VARCHAR(8) NULL;

-- CreateTable
CREATE TABLE `EInvoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `status` ENUM('REQUESTED', 'ISSUED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `buyerType` VARCHAR(16) NOT NULL DEFAULT 'CA_NHAN',
    `buyerName` VARCHAR(191) NOT NULL,
    `buyerCompany` VARCHAR(191) NULL,
    `buyerTaxCode` VARCHAR(20) NULL,
    `buyerIdNumber` VARCHAR(20) NULL,
    `buyerAddress` TEXT NULL,
    `buyerEmail` VARCHAR(191) NULL,
    `templateCode` VARCHAR(4) NULL,
    `series` VARCHAR(12) NULL,
    `number` VARCHAR(16) NULL,
    `taxAuthorityCode` VARCHAR(64) NULL,
    `lookupCode` VARCHAR(64) NULL,
    `lookupUrl` VARCHAR(500) NULL,
    `provider` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NULL,
    `issuedById` INTEGER NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EInvoice_orderId_key`(`orderId`),
    INDEX `EInvoice_storeId_status_idx`(`storeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerApplication` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'NEED_INFO', 'APPROVED', 'ACTIVATED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `storeName` VARCHAR(191) NOT NULL,
    `desiredSlug` VARCHAR(191) NULL,
    `storePhone` VARCHAR(20) NOT NULL,
    `storeEmail` VARCHAR(191) NULL,
    `storeAddressParts` JSON NOT NULL,
    `storeAddress` TEXT NOT NULL,
    `categories` TEXT NULL,
    `businessType` VARCHAR(16) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `taxCode` VARCHAR(20) NOT NULL,
    `licenseNo` VARCHAR(50) NOT NULL,
    `licenseDate` DATE NULL,
    `licensePlace` VARCHAR(191) NULL,
    `businessAddressParts` JSON NULL,
    `businessAddress` TEXT NULL,
    `representative` VARCHAR(191) NOT NULL,
    `representativeTitle` VARCHAR(191) NULL,
    `representativeId` VARCHAR(20) NOT NULL,
    `representativeIdDate` DATE NULL,
    `representativePhone` VARCHAR(20) NOT NULL,
    `representativeEmail` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `bankAccountNo` VARCHAR(30) NOT NULL,
    `bankAccountName` VARCHAR(191) NOT NULL,
    `planId` INTEGER NULL,
    `months` INTEGER NOT NULL DEFAULT 1,
    `agreedTermsAt` DATETIME(3) NOT NULL,
    `agreedPrivacyAt` DATETIME(3) NOT NULL,
    `submittedIp` VARCHAR(64) NULL,
    `reviewNote` TEXT NULL,
    `rejectReason` TEXT NULL,
    `identityMethod` VARCHAR(191) NULL,
    `identityVerifiedAt` DATETIME(3) NULL,
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `contractNo` VARCHAR(191) NULL,
    `contractData` JSON NULL,
    `contractHash` VARCHAR(64) NULL,
    `contractSentAt` DATETIME(3) NULL,
    `contractSignedAt` DATETIME(3) NULL,
    `contractSignerName` VARCHAR(191) NULL,
    `contractSignerIp` VARCHAR(64) NULL,
    `contractSignerUa` TEXT NULL,
    `paymentAmount` INTEGER NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `paymentRef` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `storeId` INTEGER NULL,
    `activatedAt` DATETIME(3) NULL,
    `history` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PartnerApplication_code_key`(`code`),
    UNIQUE INDEX `PartnerApplication_contractNo_key`(`contractNo`),
    UNIQUE INDEX `PartnerApplication_storeId_key`(`storeId`),
    INDEX `PartnerApplication_status_idx`(`status`),
    INDEX `PartnerApplication_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `data` LONGBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PartnerDocument_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EInvoice` ADD CONSTRAINT `EInvoice_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EInvoice` ADD CONSTRAINT `EInvoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerApplication` ADD CONSTRAINT `PartnerApplication_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerApplication` ADD CONSTRAINT `PartnerApplication_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerApplication` ADD CONSTRAINT `PartnerApplication_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerApplication` ADD CONSTRAINT `PartnerApplication_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerDocument` ADD CONSTRAINT `PartnerDocument_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `PartnerApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

