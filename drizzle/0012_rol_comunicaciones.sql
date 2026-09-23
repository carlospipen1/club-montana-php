-- Un rol para quien publica los álbumes de las salidas.
--
-- La galería era la única parte del sistema sin encargado propio: su capacidad
-- estaba reservada a `admin`, así que quien sacaba las fotos tenía que pedirle
-- a un administrador que las subiera por él.
--
-- Agregar un valor a un enum no rompe nada de lo que ya existe: ninguna fila lo
-- usa hasta que alguien lo elija en el formulario de socios.
ALTER TYPE "public"."rol" ADD VALUE 'comunicaciones' BEFORE 'miembro';
