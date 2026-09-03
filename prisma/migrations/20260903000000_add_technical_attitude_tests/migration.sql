-- Agrega las categorias TECHNICAL (test tecnico: bandeja, tiro, manejo de balon)
-- y ATTITUDE (test de actitud, max. 5 preguntas) al enum de pruebas fisicas.
ALTER TABLE `physical_tests`
  MODIFY COLUMN `category` ENUM('ANTHROPOMETRY', 'SPEED', 'AGILITY', 'JUMP', 'ENDURANCE', 'STRENGTH', 'TECHNICAL', 'ATTITUDE') NOT NULL;
