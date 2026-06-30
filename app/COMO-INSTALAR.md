# Daily — instalar en el iPhone

Daily es una webapp: vive en un archivo `index.html` y guarda todo en el propio
teléfono (localStorage). No necesita backend ni cuenta.

## 1. Publicarla en una URL (una sola vez)

Para que abra a pantalla completa y funcione sin internet, iOS necesita que la
página se sirva por **HTTPS**. La forma más fácil es subir la carpeta `app/` a
cualquier hosting estático gratuito:

- **GitHub Pages**: subí la carpeta al repo, activá Pages y usá la URL que te da.
- **Netlify / Vercel / Cloudflare Pages**: arrastrá la carpeta `app/` y listo.

> Probar en tu compu antes (opcional): desde la carpeta `app/` corré
> `npx serve` (o `python -m http.server`) y abrí la dirección que muestra.

## 2. Agregar a la pantalla de inicio (en el iPhone)

1. Abrí la URL en **Safari** (tiene que ser Safari, no Chrome).
2. Tocá el botón **Compartir** (el cuadrado con la flecha hacia arriba, abajo en el centro).
3. Deslizá y tocá **"Agregar a pantalla de inicio"**.
4. Confirmá el nombre (**Daily**) y tocá **Agregar**.

Listo: aparece el ícono en tu pantalla de inicio. Al abrirlo desde ahí se ve a
pantalla completa, sin la barra de Safari, y funciona aunque estés sin señal.

## Notas

- Los datos quedan **solo en ese teléfono**. No hay sincronización entre dispositivos.
- Si borrás los datos del sitio en Safari, se borra lo cargado en la app.
- iOS no permite notificaciones push con el teléfono bloqueado para webapps
  instaladas; por eso los recordatorios son visuales dentro de la app.
