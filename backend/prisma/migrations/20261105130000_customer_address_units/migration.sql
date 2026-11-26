-- Địa chỉ giao hàng của khách theo Tỉnh/Huyện/Xã (sổ địa chỉ & đơn hàng)
ALTER TABLE `Address`
  ADD COLUMN `street` VARCHAR(255) NULL,
  ADD COLUMN `provinceCode` INTEGER NULL,
  ADD COLUMN `provinceName` VARCHAR(191) NULL,
  ADD COLUMN `districtCode` INTEGER NULL,
  ADD COLUMN `districtName` VARCHAR(191) NULL,
  ADD COLUMN `wardCode` INTEGER NULL,
  ADD COLUMN `wardName` VARCHAR(191) NULL;

ALTER TABLE `Order`
  ADD COLUMN `street` VARCHAR(255) NULL,
  ADD COLUMN `provinceCode` INTEGER NULL,
  ADD COLUMN `provinceName` VARCHAR(191) NULL,
  ADD COLUMN `districtCode` INTEGER NULL,
  ADD COLUMN `districtName` VARCHAR(191) NULL,
  ADD COLUMN `wardCode` INTEGER NULL,
  ADD COLUMN `wardName` VARCHAR(191) NULL;

