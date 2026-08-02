# Tests de Daily

Tests de integración de la app. Bootean la app real en jsdom (los mismos `js/*.js`
que carga `index.html`) y verifican migración, cada vista, los modales, backup/import
y que `daily.v1` nunca se toque.

## Correrlos

```sh
cd app/tests
npm install    # una sola vez, baja jsdom
npm test
```

Sale un `N ok, 0 fail` al final; el proceso corta con código ≠ 0 si algo falla.

## Cómo está armado

- `harness.js` — bootea la app en jsdom y expone `boot()`, `ok()` y el `daily.v1` de ejemplo.
  Carga los scripts en el mismo orden que `index.html`; si agregás un `js/*.js` nuevo,
  sumalo también a `FILES`.
- `test.js` — las aserciones, agrupadas por etapa.

`node_modules/` no se commitea (está en `.gitignore`); `npm install` lo reconstruye.
