-- Comprobantes de pago recibidos por el bot de WhatsApp: se reenvian al
-- administrador del club para que confirme si son validos y a que mes
-- corresponden (respondiendo directamente a ese mensaje de WhatsApp) antes
-- de crear el pago real en la plataforma.
CREATE TABLE `whatsapp_payment_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `club_id` INTEGER NOT NULL,
    `from_phone` VARCHAR(191) NOT NULL,
    `guardian_id` INTEGER NULL,
    `player_id` INTEGER NULL,
    `media_id` VARCHAR(191) NOT NULL,
    `image_path` VARCHAR(191) NULL,
    `ai_summary` TEXT NULL,
    `status` ENUM('PENDING_ADMIN', 'CONFIRMED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_ADMIN',
    `admin_message_id` VARCHAR(191) NULL,
    `payment_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,

    UNIQUE INDEX `whatsapp_payment_reviews_payment_id_key`(`payment_id`),
    INDEX `whatsapp_payment_reviews_club_id_status_idx`(`club_id`, `status`),
    INDEX `whatsapp_payment_reviews_admin_message_id_idx`(`admin_message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `whatsapp_payment_reviews` ADD CONSTRAINT `whatsapp_payment_reviews_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_payment_reviews` ADD CONSTRAINT `whatsapp_payment_reviews_guardian_id_fkey` FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_payment_reviews` ADD CONSTRAINT `whatsapp_payment_reviews_player_id_fkey` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_payment_reviews` ADD CONSTRAINT `whatsapp_payment_reviews_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
