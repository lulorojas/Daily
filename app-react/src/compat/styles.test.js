import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { C, tint } from '../lib/theme';

/* ============================================================================
   LAS CLASES NUEVAS DICEN LO MISMO QUE LOS ESTILOS INLINE QUE REEMPLAZARON

   La etapa pedía sacar a clases con nombre lo que en la app vanilla estaba escrito como
   style="..." adentro de los template strings. El riesgo obvio de esa mudanza es
   transcribir mal un número: un 12.5px que queda en 12px no rompe ningún test, no tira
   ningún error, y se ve apenas distinto.

   Este archivo lo cubre sin confiar en la memoria de nadie: para cada clase que se creó
   en app.css se comprueba

     1. que el texto del estilo inline EXISTE tal cual en los .js de la app vanilla
        (o sea: el valor salió de ahí, no de la cabeza de quien escribió el CSS), y
     2. que la clase declara exactamente esas propiedades con esos valores.

   Si mañana alguien cambia un valor en app.css, o la app vanilla cambia el suyo, el test
   se pone rojo y hay que mirar los dos.
   ============================================================================ */

const APP_JS = path.resolve(process.cwd(), '..', 'app', 'js');
const FUENTE = ['utils.js', 'hoy.js', 'calendario.js', 'agenda.js', 'habitos.js', 'ajustes.js', 'app.js']
  .map((f) => fs.readFileSync(path.join(APP_JS, f), 'utf8'))
  .join('\n');

// Se sacan los comentarios antes de parsear: si no, quedarían pegados al selector que
// viene abajo y ninguna regla se encontraría por su nombre.
const APP_CSS = fs.readFileSync(path.resolve(process.cwd(), 'src', 'styles', 'app.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

// Las declaraciones de una regla, como un objeto { propiedad: valor } sin espacios.
function declaraciones(selector) {
  const reglas = [...APP_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const regla = reglas.find((r) => r[1].trim() === selector);
  if (!regla) throw new Error(`app.css no tiene la regla "${selector}"`);
  return normalizar(regla[2]);
}

function normalizar(css) {
  const out = {};
  for (const trozo of css.split(';')) {
    const i = trozo.indexOf(':');
    if (i < 0) continue;
    const prop = trozo.slice(0, i).trim();
    if (prop) out[prop] = trozo.slice(i + 1).replace(/\s+/g, '').trim();
  }
  return out;
}

/* ---- extracciones completas: el inline de vanilla era 100% estático ---- */
const EXACTAS = {
  '.grow': 'flex:1;min-width:0',
  '.htop-main': 'min-width:0',
  '.agtime .k': 'font-size:11px;color:rgba(242,244,248,.35)',
  '.agtitle': 'font-size:16px;font-weight:600;letter-spacing:-.2px',
  '.agdesc': 'font-size:12.5px;color:rgba(242,244,248,.55)',
  '.habrow .habmeta': 'display:flex;align-items:center;gap:6px',
  '.card.emptycard': 'padding:20px 16px',
  '.card.emptycard.sm': 'padding:18px 16px',
  '.cell.blank': 'background:none;cursor:default',
  '.card.calcard': 'padding:12px 8px 10px',
  '.cal-grid.dows': 'margin-bottom:6px',
  '.cal-grid.cells': 'gap:2px',
  '.cal-head .kicker': 'color:rgba(242,244,248,.38)',
  '.cal-head h1': 'margin-top:4px',
  '.cal-nav': 'display:flex;gap:8px',
  '.softcard.daydetail': 'padding:18px 18px 16px;display:flex;flex-direction:column;gap:14px',
  '.dd-head': 'display:flex;align-items:baseline;justify-content:space-between',
  '.dd-title': 'font-weight:700;font-size:19px;letter-spacing:-.4px',
  '.dd-sub': 'font-size:12.5px;color:rgba(242,244,248,.42);margin-top:2px',
  '.dd-list': 'display:flex;flex-direction:column;gap:9px',
  '.menulist': 'display:flex;flex-direction:column;gap:10px',
  '.evrow.menu': 'background:var(--surf);border:1px solid var(--line)',
  '.evname.lg': 'font-size:15.5px',
  '.mhrow-gap': 'width:56px',
  '.seg': 'display:flex;gap:6px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:16px;padding:5px',
  '.seg-note': 'font-size:12.5px;color:rgba(242,244,248,.4);margin:9px 4px 0',
  '.dp-month': 'font-weight:600;font-size:15.5px',
  '.dp-year': 'color:rgba(244,244,251,0.4);font-weight:500',
  '.dp-grid.dows': 'margin-bottom:4px',
  '.slot.off': 'opacity:.45',
  '.ajustes-h1': 'margin-top:10px',
  '.card.pad2': 'padding:4px 6px',
  '.infoname': 'flex:1;font-size:14.5px;font-weight:500',
  '.infoval': 'font-size:13px;color:rgba(242,244,248,.4)',
};

describe('el valor salió de la app vanilla', () => {
  it.each(Object.keys(EXACTAS))('%s', (selector) => {
    expect(FUENTE).toContain(EXACTAS[selector]);
  });
});

describe('y la clase declara exactamente eso', () => {
  it.each(Object.keys(EXACTAS))('%s', (selector) => {
    expect(declaraciones(selector)).toEqual(normalizar(EXACTAS[selector]));
  });
});

/* ---- extracciones parciales ----
   Acá el style="" de vanilla mezclaba estático con dinámico (el color de un ítem, el
   acento del formulario). Solo se extrajo el tramo estático, así que se comprueba que ese
   tramo exista en la fuente y esté en la clase; el resto sigue inline en el JSX, que es
   donde tiene que estar. */
const PARCIALES = [
  ['.evtime', 'font-size:12.5px;font-weight:600', { 'font-size': '12.5px', 'font-weight': '600' }],
  ['.rowval.date', 'font-size:16px;font-weight:700', { 'font-size': '16px' }],
  ['.rowval.time', 'font-size:18px;font-weight:700', { 'font-size': '18px' }],
  ['.evic.lg', 'width:40px;height:40px', { width: '40px', height: '40px' }],
  ['.evic.xl', 'width:42px;height:42px', { width: '42px', height: '42px' }],
  ['.habicon', 'width:38px;height:38px', { width: '38px', height: '38px' }],
  ['.inforow', 'display:flex;align-items:center;gap:12px;padding:14px 12px', { display: 'flex', gap: '12px' }],
  ['.dp-nav .navbtn', 'width:30px;height:30px', { width: '30px', height: '30px' }],
  ['.rtype', 'flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;font-weight:600;font-size:14px', { padding: '11px', 'font-size': '14px' }],
];

describe('extracciones parciales (el inline tenía además un valor dinámico)', () => {
  it.each(PARCIALES)('%s existe en vanilla', (selector, inline) => {
    expect(FUENTE).toContain(inline);
  });

  it.each(PARCIALES)('%s lo declara', (selector, inline, esperado) => {
    expect(declaraciones(selector)).toMatchObject(esperado);
  });
});

/* ---- colores calculados ----
   Tres colores quedaron escritos a mano en el CSS porque en vanilla salían de tint(), que
   es JavaScript y no se puede llamar desde una hoja de estilos. Se comprueba que el hex
   escrito sea exactamente el que devuelve tint() con la misma constante y el mismo alfa. */
describe('los colores fijos del CSS son los que calculaba tint()', () => {
  it('el anillo de un día pasado en la tira semanal', () => {
    expect(declaraciones('.wcell.past .wring').background).toBe(tint(C.amber, '47'));
  });

  it('el fondo del día elegido en el calendario', () => {
    expect(declaraciones('.cell.sel').background).toBe(tint(C.coral, '1F'));
  });

  it('y su borde', () => {
    expect(declaraciones('.cell.sel')['border-color']).toBe(tint(C.coral, '66'));
  });
});

/* ---- las variables CSS son los mismos hex que la paleta de JS ---- */
describe('la paleta del CSS y la de JS no se separaron', () => {
  const STYLES = fs.readFileSync(path.resolve(process.cwd(), 'src', 'styles', 'styles.css'), 'utf8');
  const variable = (nombre) => STYLES.match(new RegExp(`--${nombre}:\\s*(#[0-9A-Fa-f]{6})`))[1];

  it.each(['amber', 'coral', 'rose', 'green', 'teal', 'violet', 'danger', 'ink', 'bg'])('--%s', (nombre) => {
    expect(variable(nombre).toUpperCase()).toBe(C[nombre].toUpperCase());
  });
});
