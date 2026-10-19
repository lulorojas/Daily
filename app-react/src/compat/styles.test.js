import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { C } from '../lib/theme';

/* ============================================================================
   LO QUE QUEDA DE LA PARIDAD VISUAL CON LA APP VANILLA

   Hasta el rediseño "Glass + aurora" este archivo comparaba, regla por regla, que cada
   clase nueva de app.css declarara EXACTAMENTE el mismo valor que el style="" inline que
   reemplazó en la app vanilla (v3) — era el gate de la etapa 5 ("v4 reemplaza a v3"), bajo
   el supuesto de que las dos se veían idénticas.

   Ese supuesto se cae con el rediseño: v4 pasa a tener su propia identidad visual (vidrio
   esmerilado, aurora animada, tipografía con brillo), a propósito distinta de v3. Pedirle
   a CADA valor nuevo que coincida con el de una pantalla que ya no se parece en nada no
   dice nada útil — iba a estar rojo en casi todas las reglas de las ocho pantallas, por
   diseño, no por error. Por eso se borraron las listas EXACTAS/PARCIALES (estaban en el
   historial de git si algún día hace falta mirarlas) y se dejan solo los dos chequeos que
   NO dependían de parecerse a v3: que la paleta no se separe entre CSS y JS, y que
   --accent-47 se siga calculando con la misma fórmula que --glow. La paridad de verdad que
   sigue vigente es la de DATOS (src/compat/screens.test.jsx para lo que sí debe decir lo
   mismo, src/compat/emulator.test.js, el modelo): esa nunca dependió de cómo se ve nada.
   ============================================================================ */

/* ---- --accent-47 ----
   App.jsx calcula --accent y --glow por página desde la etapa 1; --accent-47 se suma en la
   etapa 3c para que <WeekStrip> (compartida entre Hoy y Hábitos) pinte el anillo de un día
   pasado con el acento que corresponda. Se verifica que App.jsx la calcule con la misma
   fórmula que --glow (tint(accent, alfa)), no que exista un valor mágico suelto. */
describe('--accent-47 se calcula igual que --glow, con otro alfa', () => {
  const APP_JSX = fs.readFileSync(path.resolve(process.cwd(), 'src', 'App.jsx'), 'utf8');

  it('App.jsx la setea con tint(accent, \'47\')', () => {
    expect(APP_JSX).toContain("tint(accent, '47')");
  });

  it('la usa exactamente el mismo componente que --glow', () => {
    expect(APP_JSX).toMatch(/--glow[\s\S]*--accent-47|--accent-47[\s\S]*--glow/);
  });
});

/* ---- las variables CSS son los mismos hex que la paleta de JS ----
   Esto no es paridad con vanilla: es que main.css y lib/theme.js no tengan cada uno su
   propia versión del mismo color. Sigue vigente con el rediseño porque los cinco acentos
   (y el ámbar/peligro) NO cambiaron — el rediseño es de superficies y movimiento, no de
   paleta. Las superficies (--bg #161826, --ink #E9E9ED) son las de Nocturne y theme.js
   las repite igual. */
describe('la paleta del CSS y la de JS no se separaron', () => {
  const STYLES = fs.readFileSync(path.resolve(process.cwd(), 'src', 'styles', 'main.css'), 'utf8');
  const variable = (nombre) => STYLES.match(new RegExp(`--${nombre}:\\s*(#[0-9A-Fa-f]{6})`))[1];

  it.each(['amber', 'coral', 'rose', 'green', 'teal', 'violet', 'danger', 'ink', 'bg'])('--%s', (nombre) => {
    expect(variable(nombre).toUpperCase()).toBe(C[nombre].toUpperCase());
  });
});
