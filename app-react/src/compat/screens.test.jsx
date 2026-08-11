import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { clone, loadVanilla } from '../test/vanilla';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, TODAY, TOMORROW, ago, thisMonday } from '../test/fixtures';
import { HoyPage } from '../pages/HoyPage';
import { CalendarioPage } from '../pages/CalendarioPage';
import { monthOf } from '../lib/calendar';

/* ============================================================================
   LO QUE SE VE: LA PANTALLA REACT CONTRA LA PANTALLA VANILLA

   vanilla.test.js compara las CUENTAS de las dos versiones. Este archivo compara lo que
   sale dibujado: se corre viewHoy() y viewCalendario() de la app que está en producción,
   se monta la pantalla React equivalente con el mismo documento y el mismo día, y se
   exige que digan exactamente lo mismo, palabra por palabra y en el mismo orden.

   Es la red que sostiene el "mismo aspecto visual" que pedía la etapa. No es un diff de
   capturas de pantalla —para eso hace falta un navegador y las dos apps con la misma
   sesión iniciada—, pero cubre lo que en la práctica se rompe en una migración así:
   un rótulo que cambió, una sección que no se dibuja, un contador mal calculado, un
   singular donde iba un plural.

   La segunda mitad cubre el otro riesgo: que una clase esté mal escrita. Como las dos
   versiones comparten styles.css, una clase con un typo no da error en ningún lado — se
   ve mal y nada más. Acá se comprueba que TODA clase que usa la app React exista en
   alguno de los tres archivos de estilos.
   ============================================================================ */

let V;
beforeAll(() => { V = loadVanilla(); });

/* El texto que se ve, sin ningún espacio en blanco.

   Se sacan TODOS los espacios, no se normalizan: la app vanilla arma su HTML con template
   strings indentados, así que entre una etiqueta y la siguiente le quedan saltos de línea
   que el navegador no muestra pero que sí aparecen en textContent. React no genera ese
   relleno. Comparar "sin espacios" es la única forma de que las dos versiones sean
   comparables como texto, y no cambia lo que el test detecta: un rótulo distinto, una
   sección que falta o un número mal calculado siguen saltando igual. */
const texto = (nodo) => nodo.textContent.replace(/\s+/g, '');

function vanillaHTML(html) {
  const cont = document.createElement('div');
  cont.innerHTML = html;
  return cont;
}

function hoyVanilla(doc, day) {
  V.setState(V.normalize(clone(doc)));
  V.ui.tab = 'hoy';
  V.ui.hoySub = null;
  V.ui.daySel = day;
  return texto(vanillaHTML(V.viewHoy()));
}

function hoyReact(doc, day) {
  const { container } = renderScreen(<HoyPage />, { doc: clone(doc), route: `/?d=${day}` });
  return texto(container);
}

function calVanilla(doc, day) {
  V.setState(V.normalize(clone(doc)));
  V.ui.tab = 'calendario';
  const { y, m } = monthOf(day);
  V.ui.calY = y;
  V.ui.calM = m;
  V.ui.calSel = day;
  return texto(vanillaHTML(V.viewCalendario()));
}

function calReact(doc, day) {
  const { container } = renderScreen(<CalendarioPage />, { doc: clone(doc), route: `/calendario?d=${day}` });
  return texto(container);
}

/* ---------------------------------------------------------------- Hoy */
describe('Hoy dice exactamente lo mismo que la app vanilla', () => {
  const casos = {
    'cuenta nueva, sin nada': [emptyDoc(), TODAY],
    'un día cargado': [fullDoc(), TODAY],
    'mañana (a futuro, hábitos no marcables)': [fullDoc(), TOMORROW],
    'un día pasado': [fullDoc(), ago(3)],
    'un día lejano y vacío': [fullDoc(), ago(200)],
    'el día de una tarea vencida': [fullDoc(), ago(40)],
    'una semana entera adelante': [fullDoc(), ago(-7)],
  };

  it.each(Object.keys(casos))('%s', (nombre) => {
    const [doc, day] = casos[nombre];
    expect(hoyReact(doc, day)).toBe(hoyVanilla(doc, day));
  });

  it('el día que se mira cambia el texto de las dos igual', () => {
    const doc = fullDoc();
    for (let i = -3; i <= 3; i++) {
      const day = ago(i);
      expect(hoyReact(doc, day)).toBe(hoyVanilla(doc, day));
    }
  });
});

/* ---------------------------------------------------------------- Calendario */
describe('el Calendario dice exactamente lo mismo que la app vanilla', () => {
  const casos = {
    'cuenta nueva, sin nada': [emptyDoc(), TODAY],
    'el mes de hoy con datos': [fullDoc(), TODAY],
    'un día sin entradas': [fullDoc(), ago(200)],
    'el mes de una tarea vencida': [fullDoc(), ago(40)],
    'un mes que arranca lunes': [fullDoc(), '2026-06-15'],
    'febrero bisiesto': [fullDoc(), '2024-02-29'],
    'diciembre': [fullDoc(), '2025-12-31'],
    'el lunes de esta semana': [fullDoc(), thisMonday],
  };

  it.each(Object.keys(casos))('%s', (nombre) => {
    const [doc, day] = casos[nombre];
    expect(calReact(doc, day)).toBe(calVanilla(doc, day));
  });

  it('las etiquetas de cada casillero y los "+N" coinciden en todo el mes', () => {
    const doc = fullDoc();
    // Un mes entero, día por día: cualquier diferencia en el recorte a dos etiquetas
    // o en el conteo del "+N" aparecería acá.
    for (const day of ['2026-08-01', '2026-08-10', '2026-08-31']) {
      expect(calReact(doc, day)).toBe(calVanilla(doc, day));
    }
  });
});

/* ---------------------------------------------------------------- clases */
describe('todas las clases que usa React existen en el CSS', () => {
  const raiz = path.resolve(process.cwd(), 'src', 'styles');
  const css = ['styles.css', 'auth.css', 'app.css']
    .map((f) => fs.readFileSync(path.join(raiz, f), 'utf8'))
    .join('\n');

  // Los nombres de clase declarados en las hojas de estilo.
  const declaradas = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  const usadas = (container) => {
    const set = new Set();
    container.querySelectorAll('*').forEach((el) => {
      el.classList.forEach((c) => set.add(c));
    });
    return [...set];
  };

  const pantallas = {
    Hoy: () => renderScreen(<HoyPage />, { doc: fullDoc() }).container,
    'Hoy vacía': () => renderScreen(<HoyPage />, { doc: emptyDoc() }).container,
    Calendario: () => renderScreen(<CalendarioPage />, { doc: fullDoc(), route: `/calendario?d=${TODAY}` }).container,
  };

  it.each(Object.keys(pantallas))('%s', (nombre) => {
    const sinDefinir = usadas(pantallas[nombre]()).filter((c) => !declaradas.has(c));
    expect(sinDefinir).toEqual([]);
  });

  it('los modales también (se dibujan fuera del contenedor, en el body)', async () => {
    const { TaskFormModal } = await import('../components/items/TaskFormModal');
    const { EventFormModal } = await import('../components/items/EventFormModal');
    const { MemoryRouter } = await import('react-router-dom');
    const { DataContext } = await import('../context/DataContext');
    const { fakeDataStore } = await import('../test/utils');

    const { store } = fakeDataStore({ doc: fullDoc() });
    const vacio = () => {};
    render(
      <MemoryRouter>
        <DataContext.Provider value={store}>
          <TaskFormModal onClose={vacio} />
          <EventFormModal onClose={vacio} />
        </DataContext.Provider>
      </MemoryRouter>,
    );

    const sinDefinir = usadas(document.body).filter((c) => !declaradas.has(c));
    expect(sinDefinir).toEqual([]);
  });
});
