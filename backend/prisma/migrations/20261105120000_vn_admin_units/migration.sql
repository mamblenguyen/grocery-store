-- Địa chỉ theo đơn vị hành chính Tỉnh/Huyện/Xã cho cửa hàng (đối tác) & vùng hoạt động của tài xế
ALTER TABLE `Store`
  ADD COLUMN `street` VARCHAR(255) NULL,
  ADD COLUMN `provinceCode` INTEGER NULL,
  ADD COLUMN `provinceName` VARCHAR(191) NULL,
  ADD COLUMN `districtCode` INTEGER NULL,
  ADD COLUMN `districtName` VARCHAR(191) NULL,
  ADD COLUMN `wardCode` INTEGER NULL,
  ADD COLUMN `wardName` VARCHAR(191) NULL,
  ADD COLUMN `businessAddressParts` JSON NULL;

CREATE INDEX `Store_provinceCode_districtCode_idx` ON `Store`(`provinceCode`, `districtCode`);

ALTER TABLE `ShipperProfile`
  MODIFY `area` TEXT NULL,
  ADD COLUMN `areas` JSON NULL;
