import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { clone, loadVanilla } from '../test/vanilla';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, TODAY } from '../test/fixtures';
import { HoyPage } from '../pages/HoyPage';
import { CalendarioPage } from '../pages/CalendarioPage';
import { TaskFormModal } from '../components/items/TaskFormModal';
import { EventFormModal } from '../components/items/EventFormModal';
import { DayAddMenu } from '../components/calendario/DayAddMenu';
import { DataContext } from '../context/DataContext';
import { fakeDataStore } from '../test/utils';
import { monthOf } from '../lib/calendar';
import { C, tint } from '../lib/theme';

/* ============================================================================
   COMPARACIÓN PÍXEL A PÍXEL CONTRA LA APP VANILLA

   La idea, que es la misma que se usó en la etapa 1 con las pantallas de sesión: las dos
   versiones comparten styles.css, así que si el HTML que produce cada una se abre en el
   MISMO navegador con la MISMA hoja de estilos, dos capturas idénticas significan que en
   pantalla se ven idénticas.

   Cómo funciona:
     1. se genera el HTML de la pantalla con las dos implementaciones (la vanilla llamando
        a viewHoy() / viewCalendario() reales, la nueva montando el componente);
     2. cada uno se mete en una página con los tres CSS de la app y las mismas fuentes;
     3. se abren las dos en Edge (el que ya está instalado en la máquina: no se baja
        ningún navegador) y se saca una captura de cada una;
     4. se comparan píxel por píxel con un canvas, y si hay diferencias se guardan las dos
        capturas más una tercera con las zonas distintas pintadas de rojo.

   No corre en `npm test`, igual que los tests del emulador: necesita un navegador y tarda.
   Se corre así:
     npm run test:pixel
   ============================================================================ */

const CORRER = process.env.VITEST_PIXEL === '1';
const SALIDA = path.resolve(process.cwd(), 'pixel-diff');
const ESTILOS = path.resolve(process.cwd(), 'src', 'styles');

/* Cada versión se dibuja con LAS HOJAS QUE USA EN PRODUCCIÓN, no con las mismas:

     vanilla → styles.css y nada más (es todo lo que carga su index.html);
     React   → las tres, en el mismo orden en que las importa main.jsx.

   Esto no es un detalle del arnés: es justamente lo que hay que demostrar. app.css existe
   para que el marcado nuevo se vea igual que el viejo con su CSS viejo. Si se le pasaran
   las tres hojas a la versión vanilla, el test estaría comparando dos cosas dibujadas con
   reglas que la app actual no tiene, y no probaría nada. */
const css = (hojas) => hojas
  .map((f) => fs.readFileSync(path.join(ESTILOS, f), 'utf8'))
  .join('\n');

const HOJAS_VANILLA = ['styles.css'];
const HOJAS_REACT = ['styles.css', 'auth.css', 'app.css'];

/* Las animaciones de entrada se apagan en las dos por igual: una captura sacada a mitad
   de la animación de una y al final de la otra daría una diferencia que no existe.
   `desplegado` estira el alto para que entre toda la pantalla en la captura, en vez de
   quedarse con lo que se ve sin scrollear. */
/* Las tipografías se bajan UNA vez y se incrustan en las dos páginas como data: URI.

   Con el <link> a Google Fonts, cada página las pedía por su cuenta y pasaban dos cosas
   feas: si una alcanzaba a dibujarse con la de reserva antes que la otra, todos los textos
   medían distinto y la comparación fallaba sin que hubiera nada mal; y si la red se caía,
   el test se caía con ella. Incrustadas, las dos páginas arrancan con exactamente la misma
   tipografía y sin tocar la red. */
const FUENTES_URL = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap';
// Sin un User-Agent de navegador moderno, Google devuelve formatos viejos.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function bajarFuentes() {
  const hoja = await fetch(FUENTES_URL, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  let out = hoja;
  for (const [, url] of hoja.matchAll(/url\((https:[^)]+)\)/g)) {
    const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
    out = out.replaceAll(url, `data:font/woff2;base64,${buf.toString('base64')}`);
  }
  return out;
}

let fuentes = '';

function pagina(cuerpo, { desplegado, hojas }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${fuentes}</style>
<style>${css(hojas)}</style>
<style>
  *, *::before, *::after { animation: none !important; transition: none !important; }
  ${desplegado ? 'html, body, #app, .view { height: auto !important; overflow: visible !important; }' : ''}
</style>
</head><body>${cuerpo}</body></html>`;
}

// El envoltorio que en la app pone #app (vanilla lo hace en render(), React en App.jsx).
const enApp = (html, acento) =>
  `<div id="app" style="--accent:${acento};--glow:${tint(acento, '1F')}">${html}</div>`;

let V;
let browser;
let contexto;

beforeAll(async () => {
  if (!CORRER) return;
  V = loadVanilla();
  fuentes = await bajarFuentes();
  const { chromium } = await import('playwright');
  // channel msedge = el Edge que ya viene con Windows. No descarga ningún navegador.
  browser = await chromium.launch({ channel: 'msedge' });
  /* Un solo contexto para las dos capturas de cada caso: así comparten la caché y las
     tipografías se bajan una vez sola. Con un contexto por página, la primera esperaba la
     descarga y la segunda la tomaba de la caché — y esa diferencia de tiempos era la que
     hacía que el mismo caso pasara o fallara según la corrida. */
  contexto = await browser.newContext({
    viewport: { width: 390, height: 844 },   // un teléfono típico
    deviceScaleFactor: 2,
  });
  fs.mkdirSync(SALIDA, { recursive: true });
});

afterAll(async () => { if (browser) await browser.close(); });

/* Con `line-height: normal` el alto de cada línea sale de las métricas de la fuente REAL.
   Si una página se dibuja con Instrument Sans y la otra alcanza a mostrarse con la de
   reserva, cada bloque de texto mide un píxel distinto y toda la pantalla se corre. Por eso
   no alcanza con document.fonts.ready: hay que pedir explícitamente las variantes que la
   app usa y esperar a que estén. */
const FUENTES = [
  '600 11px "Instrument Sans"', '500 14px "Instrument Sans"', '400 16px "Instrument Sans"',
  '800 33px "Bricolage Grotesque"', '700 22px "Bricolage Grotesque"', '700 15px "Bricolage Grotesque"',
];

async function capturar(html, { desplegado, hojas }) {
  const page = await contexto.newPage();
  await page.setContent(pagina(html, { desplegado, hojas }), { waitUntil: 'load' });
  await page.evaluate(async (fuentes) => {
    await Promise.all(fuentes.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  }, FUENTES);
  const shot = await page.screenshot({ fullPage: desplegado });
  await page.close();
  return shot;
}

/* Compara dos PNG dentro del navegador: se dibujan en un canvas y se recorren los píxeles.
   Se hace acá y no en Node para no sumar ninguna dependencia de imágenes. */
async function comparar(a, b) {
  const page = await browser.newPage();
  const resultado = await page.evaluate(async ([srcA, srcB]) => {
    const cargar = (src) => new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = src;
    });
    const [ia, ib] = await Promise.all([cargar(srcA), cargar(srcB)]);
    if (ia.width !== ib.width || ia.height !== ib.height) {
      return { distintos: -1, a: `${ia.width}x${ia.height}`, b: `${ib.width}x${ib.height}` };
    }
    const lienzo = (img) => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.getContext('2d').getImageData(0, 0, img.width, img.height);
    };
    const da = lienzo(ia), db = lienzo(ib);
    const salida = document.createElement('canvas');
    salida.width = ia.width; salida.height = ia.height;
    const ctx = salida.getContext('2d');
    const diff = ctx.createImageData(ia.width, ia.height);
    let distintos = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      // Tolerancia de 3/255 por canal: el antialiasing del texto no es idéntico bit a bit
      // entre dos renderizados aunque se vea igual.
      const igual = Math.abs(da.data[i] - db.data[i]) <= 3
        && Math.abs(da.data[i + 1] - db.data[i + 1]) <= 3
        && Math.abs(da.data[i + 2] - db.data[i + 2]) <= 3
        && Math.abs(da.data[i + 3] - db.data[i + 3]) <= 3;
      if (igual) {
        diff.data[i] = da.data[i]; diff.data[i + 1] = da.data[i + 1];
        diff.data[i + 2] = da.data[i + 2]; diff.data[i + 3] = 60;
      } else {
        distintos++;
        diff.data[i] = 255; diff.data[i + 1] = 0; diff.data[i + 2] = 0; diff.data[i + 3] = 255;
      }
    }
    ctx.putImageData(diff, 0, 0);
    return { distintos, total: da.data.length / 4, diff: salida.toDataURL('image/png') };
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
  await page.close();
  return resultado;
}

/* ---------------------------------------------------------------- los casos */

function hoy(doc, day) {
  V.setState(V.normalize(clone(doc)));
  V.ui.tab = 'hoy'; V.ui.hoySub = null; V.ui.daySel = day;
  const { container } = renderScreen(<HoyPage />, { doc: clone(doc), route: `/?d=${day}` });
  return { vanilla: V.viewHoy(), react: container.innerHTML, acento: C.amber };
}

function calendario(doc, day) {
  V.setState(V.normalize(clone(doc)));
  const { y, m } = monthOf(day);
  V.ui.tab = 'calendario'; V.ui.calY = y; V.ui.calM = m; V.ui.calSel = day;
  const { container } = renderScreen(<CalendarioPage />, { doc: clone(doc), route: `/calendario?d=${day}` });
  return { vanilla: V.viewCalendario(), react: container.innerHTML, acento: C.coral };
}

// Los modales viven fuera de #app, en su propia capa.
function modal(abrirVanilla, Componente, acento) {
  V.setState(V.normalize(emptyDoc()));
  V.ui.calSel = TODAY;
  abrirVanilla();
  const vanilla = document.getElementById('overlay').innerHTML;

  const { store } = fakeDataStore({ doc: emptyDoc() });
  render(
    <MemoryRouter>
      <DataContext.Provider value={store}>
        <Componente onClose={() => {}} defaultDate={TODAY} />
      </DataContext.Provider>
    </MemoryRouter>,
  );
  const react = document.querySelector('body > div > .overlay, body > .overlay').innerHTML;
  V.closeModal();
  return { vanilla, react, acento, capa: true };
}

/* El menú de "Agregar" de un día del calendario. Es el único de los dos menús que se puede
   comparar: el del botón + tiene cuatro opciones en la app vanilla y dos acá (hábito y
   peso llegan con sus pantallas), así que compararlos daría una diferencia esperada. */
function menuDelDia() {
  V.setState(V.normalize(emptyDoc()));
  V.calAddMenu(TODAY);
  const vanilla = document.getElementById('overlay').innerHTML;

  const { store } = fakeDataStore({ doc: emptyDoc() });
  render(
    <MemoryRouter>
      <DataContext.Provider value={store}>
        <DayAddMenu day={TODAY} onClose={() => {}} onTask={() => {}} onEvent={() => {}} />
      </DataContext.Provider>
    </MemoryRouter>,
  );
  const react = document.querySelector('.overlay').innerHTML;
  V.closeModal();
  return { vanilla, react, acento: C.coral, capa: true };
}

const CASOS = {
  'Hoy — con datos': () => hoy(fullDoc(), TODAY),
  'Hoy — cuenta nueva': () => hoy(emptyDoc(), TODAY),
  'Calendario — con datos': () => calendario(fullDoc(), TODAY),
  'Calendario — cuenta nueva': () => calendario(emptyDoc(), TODAY),
  'Modal — nueva tarea': () => modal(() => V.taskModal(null, TODAY), TaskFormModal, C.amber),
  'Modal — nueva cita': () => modal(() => V.eventModal(null, TODAY), EventFormModal, C.coral),
  'Menú — agregar a un día': menuDelDia,
};

describe.runIf(CORRER)('píxel a píxel contra la app vanilla', () => {
  it.each(Object.keys(CASOS))('%s', async (nombre) => {
    const { vanilla, react, acento, capa } = CASOS[nombre]();

    const envolver = (html) => (capa
      ? `<div class="overlay show">${html}</div>`
      : enApp(html, acento));

    /* De a una y no en paralelo: una captura de página completa hace que Chromium
       agrande la ventana por dentro, y dos pestañas haciéndolo a la vez salen mal
       (la pantalla aparece repetida en mosaico). */
    const shotV = await capturar(envolver(vanilla), { desplegado: !capa, hojas: HOJAS_VANILLA });
    const shotR = await capturar(envolver(react), { desplegado: !capa, hojas: HOJAS_REACT });

    const r = await comparar(shotV, shotR);
    const archivo = nombre.replace(/[^\w]+/g, '-').toLowerCase();

    if (r.distintos !== 0) {
      // Las tres imágenes quedan en pixel-diff/ para poder mirarlas, y también las dos
      // páginas enteras: con el HTML a mano se puede abrir cada una y medir qué se corrió.
      fs.writeFileSync(path.join(SALIDA, `${archivo}-vanilla.png`), shotV);
      fs.writeFileSync(path.join(SALIDA, `${archivo}-react.png`), shotR);
      fs.writeFileSync(path.join(SALIDA, `${archivo}-vanilla.html`), pagina(envolver(vanilla), { desplegado: !capa, hojas: HOJAS_VANILLA }));
      fs.writeFileSync(path.join(SALIDA, `${archivo}-react.html`), pagina(envolver(react), { desplegado: !capa, hojas: HOJAS_REACT }));
      if (r.diff) {
        fs.writeFileSync(
          path.join(SALIDA, `${archivo}-diff.png`),
          Buffer.from(r.diff.split(',')[1], 'base64'),
        );
      }
    }

    expect(r.distintos, `capturas en pixel-diff/${archivo}-*.png (${r.a || ''} vs ${r.b || ''})`).toBe(0);
  }, 60000);
});
