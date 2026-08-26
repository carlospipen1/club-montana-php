# Fotos de la galería

Deja aquí las fotos de las salidas del club. Aparecen solas en la portada: no hay
que tocar código ni registrar los archivos en ninguna lista.

## Cómo agregar una foto

1. Copia el archivo a esta carpeta.
2. Nómbralo con un número de orden y una descripción, separados por guiones:

   ```
   01-cumbre-del-tolhuaca.jpg
   02-travesia-a-la-laguna-blanca.jpg
   03-curso-de-autorrescate.jpg
   ```

3. Súbela al repositorio:

   ```
   git add public/galeria
   git commit -m "Agregar fotos de la salida al Tolhuaca"
   git push origin main
   ```

Vercel vuelve a desplegar solo y la foto queda publicada.

## Por qué el nombre importa

- **El número del principio** define el orden y no se muestra.
- **El resto del nombre** se convierte en el pie de foto y en el texto que lee
  un lector de pantalla. `03-curso-de-autorrescate.jpg` se muestra como
  *"Curso de autorrescate"*.

Evita nombres como `IMG_20250312.jpg`: quedan feos en el pie y no le dicen nada a
alguien que no ve la imagen.

## Formatos y tamaño

Sirven `.jpg`, `.png`, `.webp` y `.avif`.

Las fotos se recortan a formato horizontal (3:2), así que las apaisadas se ven
mejor que las verticales.

**Reduce el tamaño antes de subirlas.** Una foto directa del celular pesa 4 o 5 MB;
para la web bastan unos 300 KB. Next.js las optimiza al servirlas, pero un archivo
liviano hace el repositorio más manejable. En [squoosh.app](https://squoosh.app)
puedes reducirlas sin instalar nada: ancho máximo 2000 px y calidad 80.

## Quitar una foto

Borra el archivo de esta carpeta y vuelve a subir. Desaparece del sitio.

Si la carpeta queda sin fotos, la sección de galería no se muestra en la portada.
