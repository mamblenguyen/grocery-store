-- Thông tin đối tác (pháp lý, người đại diện, tài khoản đối soát, hợp đồng)
ALTER TABLE `Store`
  ADD COLUMN `businessName` VARCHAR(191) NULL,
  ADD COLUMN `businessType` VARCHAR(191) NULL,
  ADD COLUMN `taxCode` VARCHAR(191) NULL,
  ADD COLUMN `businessAddress` TEXT NULL,
  ADD COLUMN `representative` VARCHAR(191) NULL,
  ADD COLUMN `representativeId` VARCHAR(191) NULL,
  ADD COLUMN `representativePhone` VARCHAR(191) NULL,
  ADD COLUMN `bankName` VARCHAR(191) NULL,
  ADD COLUMN `bankAccountNo` VARCHAR(191) NULL,
  ADD COLUMN `bankAccountName` VARCHAR(191) NULL,
  ADD COLUMN `contractNo` VARCHAR(191) NULL,
  ADD COLUMN `contractSignedAt` DATETIME(3) NULL;
