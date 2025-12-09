-- Buscar usuario por email
SELECT * FROM usuarios WHERE email = 'estebanmorrison@gmail.com';

-- Si solo quieres ver si existe (retorna 1 si existe, 0 si no)
SELECT COUNT(*) FROM usuarios WHERE email = 'estebanmorrison@gmail.com';

-- Si solo quieres ver ciertos campos
SELECT id, nombres, apellidos, email FROM usuarios WHERE email = 'estebanmorrison@gmail.com';

