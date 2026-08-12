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
const FUENTE = [
  'utils.js', 'hoy.js', 'calendario.js', 'agenda.js', 'habitos.js', 'ajustes.js', 'app.js',
  'gimnasio.js', 'rutinas.js', 'progreso.js',
]
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

  // ---- gimnasio / rutinas / hábitos / progreso (etapa 3b/3c) ----
  '.sectrow': 'display:flex;align-items:center;justify-content:space-between;margin:0 2px',
  '.weekstrip.weeknav': 'gap:8px;flex:none',
  '.card.plancard': 'padding:6px 8px',
  // (background y color van por separado: en vanilla los separa el ternario de `rest`,
  // así que no son un tramo contiguo de texto — ver .gchip.rest en PARCIALES más abajo)
  '.dashed.managetypes': 'margin-top:2px',
  '.bigcard-num': 'font-weight:800;font-size:44px;line-height:.9;letter-spacing:-2px',
  '.bigcard-unit': 'font-size:15px;font-weight:500;color:rgba(242,244,248,.45)',
  '.bigcard-since': 'font-size:11.5px;color:rgba(242,244,248,.35)',
  '.chartlabels': 'display:flex;justify-content:space-between;font-size:10.5px;font-weight:500;color:rgba(242,244,248,.3)',
  '.liftdetail-val': 'font-weight:800;font-size:34px;letter-spacing:-1px',
  '.liftdetail-unit': 'font-size:14px;font-weight:500;color:rgba(242,244,248,.5)',
  '.liftdetail-prlbl': 'font-size:11px;font-weight:600;letter-spacing:1px;color:rgba(242,244,248,.4)',
  '.liftdetail-hint': 'font-size:12.5px;color:rgba(242,244,248,.4)',
  '.rutlist-h1': 'margin-top:5px',
  '.rcard-name': 'font-weight:600;font-size:20px;letter-spacing:-.4px',
  '.rcard-sub': 'font-size:13px;color:rgba(242,244,248,.45);margin-top:2px',
  '.managerow-title': 'font-weight:600;font-size:15.5px;letter-spacing:-.1px',
  '.beststreak-label': 'font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:rgba(242,244,248,.5)',
  '.beststreak-n': 'font-weight:800;font-size:34px;line-height:1;letter-spacing:-1.2px',
  '.streakrow-title': 'font-weight:600;font-size:15px',
  '.balance-total': 'font-weight:800;font-size:25px;letter-spacing:-.8px;line-height:1',
  '.balance-legend-pct': 'font-size:12.5px;font-weight:600',
  '.barchart-num': 'font-weight:800;font-size:26px;letter-spacing:-.9px;line-height:1',
  '.cargas-cur': 'font-weight:800;font-size:24px;letter-spacing:-.8px;line-height:1',
  '.heatcell': 'height:15px;border-radius:4px',
  '.rutentry-chev': 'font-size:16px;color:rgba(242,244,248,.5)',
  '.fieldhint': 'font-size:12px;color:rgba(242,244,248,.35);margin:2px 2px 0',
  '.kgunit': 'font-size:17px;font-weight:500;color:rgba(242,244,248,.45)',
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

  // ---- gimnasio / rutinas / hábitos / progreso ----
  ['.rowinp.newliftrow', 'margin-top:11px;border:1.5px dashed', { 'margin-top': '11px' }],
  ['.weightbox', 'border-radius:20px;background:rgba(255,255,255,.04);border:1.5px solid var(--line);padding:16px', { padding: '16px' }],
  ['.weightbox-val', 'text-align:center;display:flex;align-items:baseline;justify-content:center;gap:6px;margin-bottom:15px', { 'margin-bottom': '15px' }],
  ['.stepbtn.dec', 'background:rgba(255,255,255,.06)', { background: 'rgba(255,255,255,.06)' }],
  ['.roundadd', 'width:36px;height:36px;border-radius:12px', { width: '36px', height: '36px' }],
  ['.rutentry-icon', 'width:44px;height:44px;flex:none;border-radius:15px', { width: '44px', height: '44px' }],
  ['.beststreak', 'border-radius:26px', { 'border-radius': '26px' }],
  ['.beststreak-icon', 'width:56px;height:56px;flex:none;border-radius:20px', { width: '56px', height: '56px' }],
  ['.habicon.sm', 'width:36px;height:36px', { width: '36px', height: '36px' }],
  ['.balance-donut', 'width:124px;height:124px;flex:none', { width: '124px', height: '124px' }],
  ['.balance-dot', 'width:9px;height:9px;border-radius:3px', { width: '9px', height: '9px' }],
  ['.cargas-dot', 'width:8px;height:8px;border-radius:50%', { width: '8px', height: '8px' }],
  // El fondo/color de .gchip.rest y el background de los dos puntos de arriba van
  // separados por un ternario en vanilla (`background:${rest?'…':tint(col,'24')}`), así
  // que no forman un tramo contiguo de texto: se verifican solo los literales que sí lo son.
  ['.gchip.rest', 'rgba(255,255,255,.05)', { background: 'rgba(255,255,255,.05)' }],
  ['.gchip.rest', 'rgba(242,244,248,.5)', { color: 'rgba(242,244,248,.5)' }],
  ['.typedot', 'width:11px;height:11px;border-radius:50%', { width: '11px', height: '11px' }],
  ['.managerow-kg', 'font-weight:700;font-size:15.5px', { 'font-size': '15.5px' }],
  ['.managerow-kg.narrow', 'min-width:62px', { 'min-width': '62px' }],
  ['.prtag', 'font-size:10px;font-weight:700', { 'font-size': '10px' }],
  ['.kginput', 'border-radius:20px;background:rgba(255,255,255,.04);border:1.5px solid', { padding: '18px' }],
  ['.kgfield', "font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px;letter-spacing:-2px", { 'font-size': '40px' }],
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
   Algunos colores quedaron escritos a mano en el CSS porque en vanilla salían de tint(),
   que es JavaScript y no se puede llamar desde una hoja de estilos. Se comprueba que el
   hex escrito sea exactamente el que devuelve tint() con la misma constante y el mismo
   alfa. El anillo de un día pasado en la tira semanal es la excepción: desde que
   <WeekStrip> se comparte entre Hoy (ámbar) y Hábitos (verde), ese valor no es una
   constante del módulo — es --accent-47, que calcula App.jsx por página (ver el
   comentario ahí). Se verifica en cambio que la propia variable exista con el valor
   correcto en las dos páginas: eso lo cubre compat/screens.test.jsx, que compara el HTML
   completo de Hoy y de Hábitos contra la app vanilla. */
describe('los colores fijos del CSS son los que calculaba tint()', () => {
  it('el fondo del día elegido en el calendario', () => {
    expect(declaraciones('.cell.sel').background).toBe(tint(C.coral, '1F'));
  });

  it('y su borde', () => {
    expect(declaraciones('.cell.sel')['border-color']).toBe(tint(C.coral, '66'));
  });
});

/* ---- --accent-47, la variable nueva de esta etapa ----
   App.jsx calcula --accent y --glow por página desde la etapa 1; --accent-47 se suma acá
   para que <WeekStrip> (compartida entre Hoy y Hábitos desde la 3c) pinte el anillo de un
   día pasado con el acento que corresponda, en vez del ámbar hardcodeado que tenía cuando
   la usaba solo Hoy. Se verifica que App.jsx la calcule con la misma fórmula que --glow
   (tint(accent, alfa)), no que exista un valor mágico suelto. */
describe('--accent-47 se calcula igual que --glow, con otro alfa', () => {
  const APP_JSX = fs.readFileSync(path.resolve(process.cwd(), 'src', 'App.jsx'), 'utf8');

  it('App.jsx la setea con tint(accent, \'47\')', () => {
    expect(APP_JSX).toContain("tint(accent, '47')");
  });

  it('la usa exactamente el mismo componente que --glow', () => {
    expect(APP_JSX).toMatch(/--glow[\s\S]*--accent-47|--accent-47[\s\S]*--glow/);
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
