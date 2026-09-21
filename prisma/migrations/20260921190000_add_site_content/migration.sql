-- Contenido del sitio publico (cholesteam.com): galeria de fotos, eventos
-- del club y catalogo de tienda (uniformes, balones, zapatos, camisetas,
-- gorras -- solo para mostrar, sin pagos en linea). Publico sin sesion.
CREATE TABLE `gallery_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `club_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image_path` VARCHAR(191) NULL,
    `image_mime_type` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gallery_images_club_id_idx`(`club_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `club_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `date` DATETIME(3) NOT NULL,
    `time_label` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `image_path` VARCHAR(191) NULL,
    `image_mime_type` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `club_events_club_id_date_idx`(`club_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `club_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NULL,
    `category` ENUM('UNIFORME', 'BALON', 'ZAPATO', 'CAMISETA', 'GORRA', 'OTRO') NOT NULL,
    `image_path` VARCHAR(191) NULL,
    `image_mime_type` VARCHAR(191) NULL,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `products_club_id_idx`(`club_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gallery_images` ADD CONSTRAINT `gallery_images_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `club_events` ADD CONSTRAINT `club_events_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Contenido de ejemplo (placeholders) para que las paginas publicas no se
-- vean vacias antes de que el club suba fotos/eventos/productos reales
-- desde el panel "Sitio web". Se identifican con "(ejemplo)" en el titulo
-- para que sea obvio que se pueden editar o borrar desde el panel.
INSERT INTO `gallery_images` (`club_id`, `title`, `description`, `sort_order`)
SELECT `id`, 'Entrenamiento U12 (ejemplo)', 'Foto de ejemplo -- sube la foto real desde Sitio web > Galeria.', 1 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `gallery_images` (`club_id`, `title`, `description`, `sort_order`)
SELECT `id`, 'Partido amistoso U14 (ejemplo)', 'Foto de ejemplo -- sube la foto real desde Sitio web > Galeria.', 2 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `gallery_images` (`club_id`, `title`, `description`, `sort_order`)
SELECT `id`, 'Torneo interclubes (ejemplo)', 'Foto de ejemplo -- sube la foto real desde Sitio web > Galeria.', 3 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `gallery_images` (`club_id`, `title`, `description`, `sort_order`)
SELECT `id`, 'Premiacion de fin de año (ejemplo)', 'Foto de ejemplo -- sube la foto real desde Sitio web > Galeria.', 4 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `gallery_images` (`club_id`, `title`, `description`, `sort_order`)
SELECT `id`, 'Dia de familia Choles Team (ejemplo)', 'Foto de ejemplo -- sube la foto real desde Sitio web > Galeria.', 5 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `gallery_images` (`club_id`, `title`, `description`, `sort_order`)
SELECT `id`, 'Seleccion U16 en accion (ejemplo)', 'Foto de ejemplo -- sube la foto real desde Sitio web > Galeria.', 6 FROM `clubs` WHERE `slug` = 'choles-team';

INSERT INTO `club_events` (`club_id`, `title`, `description`, `date`, `time_label`, `location`)
SELECT `id`, 'Torneo de bienvenida 2026 (ejemplo)', 'Evento de ejemplo -- edita la fecha, la hora, el lugar y la descripcion real desde Sitio web > Eventos.', '2026-10-04 00:00:00', '3:00 pm', 'Cancha techada, Garupal' FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `club_events` (`club_id`, `title`, `description`, `date`, `time_label`, `location`)
SELECT `id`, 'Clinica de tiro con entrenadores invitados (ejemplo)', 'Evento de ejemplo -- edita la fecha, la hora, el lugar y la descripcion real desde Sitio web > Eventos.', '2026-10-18 00:00:00', '4:00 pm', 'Cancha, Los Cortijos' FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `club_events` (`club_id`, `title`, `description`, `date`, `time_label`, `location`)
SELECT `id`, 'Dia de puertas abiertas (ejemplo)', 'Evento de ejemplo -- edita la fecha, la hora, el lugar y la descripcion real desde Sitio web > Eventos.', '2026-09-06 00:00:00', '9:00 am', 'Cancha techada, Garupal' FROM `clubs` WHERE `slug` = 'choles-team';

INSERT INTO `products` (`club_id`, `name`, `description`, `price`, `category`, `sort_order`)
SELECT `id`, 'Uniforme oficial Choles Team (ejemplo)', 'Camiseta + short del uniforme oficial. Precio de ejemplo -- ajustalo desde Sitio web > Tienda.', 90000.00, 'UNIFORME', 1 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `products` (`club_id`, `name`, `description`, `price`, `category`, `sort_order`)
SELECT `id`, 'Balon de baloncesto oficial (ejemplo)', 'Balon oficial del club. Precio de ejemplo -- ajustalo desde Sitio web > Tienda.', 120000.00, 'BALON', 2 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `products` (`club_id`, `name`, `description`, `price`, `category`, `sort_order`)
SELECT `id`, 'Zapatillas de baloncesto (ejemplo)', 'Zapatillas recomendadas para entrenamiento y partidos. Precio de ejemplo -- ajustalo desde Sitio web > Tienda.', 250000.00, 'ZAPATO', 3 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `products` (`club_id`, `name`, `description`, `price`, `category`, `sort_order`)
SELECT `id`, 'Camiseta de entrenamiento (ejemplo)', 'Camiseta para entrenamientos diarios. Precio de ejemplo -- ajustalo desde Sitio web > Tienda.', 45000.00, 'CAMISETA', 4 FROM `clubs` WHERE `slug` = 'choles-team';
INSERT INTO `products` (`club_id`, `name`, `description`, `price`, `category`, `sort_order`)
SELECT `id`, 'Gorra Choles Team (ejemplo)', 'Gorra con el logo del club. Precio de ejemplo -- ajustalo desde Sitio web > Tienda.', 35000.00, 'GORRA', 5 FROM `clubs` WHERE `slug` = 'choles-team';
