-- Agrega el estado PARTIAL ("Abono" / pago parcial) al enum de pagos,
-- y una columna para llevar cuanto se ha pagado hasta ahora de cada cargo
-- (para distinguir un abono del valor total que se debe).
ALTER TABLE `payments`
  MODIFY COLUMN `status` ENUM('PAID', 'PENDING', 'OVERDUE', 'PARTIAL') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `payments`
  ADD COLUMN `amount_paid` DOUBLE NOT NULL DEFAULT 0;

-- Los pagos que ya estaban marcados como PAID quedan con amount_paid = amount,
-- para que los calculos de saldo pendiente sean correctos desde ya.
UPDATE `payments` SET `amount_paid` = `amount` WHERE `status` = 'PAID';
