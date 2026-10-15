import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { clone, loadVanilla } from '../test/vanilla';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, TODAY, TOMORROW, ago, thisMonday } from '../test/fixtures';
import { HoyPage } from '../pages/HoyPage';
import { CalendarioPage } from '../pages/CalendarioPage';
import { GymPage } from '../pages/GymPage';
import { RutinasListPage } from '../pages/rutinas/RutinasListPage';
import { RutinaDetailPage } from '../pages/rutinas/RutinaDetailPage';
import { RutinaDayPage } from '../pages/rutinas/RutinaDayPage';
import { HabitosPage } from '../pages/HabitosPage';
import { ProgresoPage } from '../pages/ProgresoPage';
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
/* Rediseño Nocturne: los días de la tira semanal pasaron de una letra ("L") a tres ("LUN")
   y el de hoy lleva una insignia "HOY" — es identidad visual nueva, sin equivalente en
   vanilla. Se sacan los `.wdays` de los DOS lados antes de comparar; el resto de la
   pantalla sigue bajo la misma red de seguridad. */
const texto = (nodo) => {
  const copia = nodo.cloneNode(true);
  copia.querySelectorAll('.wdays').forEach((el) => el.remove());
  // El "·" que vanilla pegaba entre el título y su aclaración ("Tareas · 1/2") ahora es un
  // contador aparte a la derecha del título: mismo dato, sin el separador.
  return copia.textContent.replace(/[\s·]+/g, '');
};

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
  /* Rediseño "Glass + aurora": el arco de progreso del día ahora muestra, además del
     porcentaje, dos chips con el desglose Tareas X/Y y Hábitos X/Y (.progday-stats) — sin
     equivalente en vanilla, que solo mostraba el total combinado. Se sacan antes de
     comparar, igual que ya se hacía con lo de Gimnasio (ver gymReact): el resto de Hoy
     (agenda, tareas, hábitos, bandeja sin fecha) sigue siendo migración 1:1 y queda bajo
     esta misma red de seguridad. */
  container.querySelectorAll('.progday-stats').forEach((el) => el.remove());
  /* Rediseño Nocturne, en Hoy:
     - El contador de Hábitos ("3/5") y el cartel "Nada con horario para este día." son
       texto nuevo sin equivalente en vanilla: se sacan.
     - Agenda y Entreno van juntos en la columna de la derecha del progreso (en vanilla,
       Entreno venía después de Tareas): se mueve Entreno a donde estaba para comparar el
       contenido sin que el cambio de orden visual lo oculte. */
  container.querySelectorAll('.hoy-habitos .listcard-count, .hoy-sinhorario').forEach((el) => el.remove());
  const entreno = container.querySelector('.hoy-entreno');
  if (entreno) container.querySelector('.hoy-tareas').after(entreno);
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

/* ---------------------------------------------------------------- Gimnasio */
/* Gimnasio dejó de compararse letra por letra contra la vanilla (viewGym()): el rediseño
   "Glass + aurora" reordena las secciones (Cargas y Frecuencia semanal, nueva, pasan a ir
   ANTES de Peso corporal) y agrega contenido propio (las tres stats del plan semanal, la
   Frecuencia semanal entera) — ni el orden ni el texto nuevo tienen con qué compararse del
   lado de vanilla. Lo que sigue vigente (y con su propio test) es que el plan semanal LEA
   y ESCRIBA bien el modelo — eso es src/compat/emulator.test.js y GymPage.test.jsx, que no
   dependen de cómo se ve nada. */

/* ---------------------------------------------------------------- Rutinas */
function rutinasVanilla(doc, { rutId = null, dayId = null } = {}) {
  V.setState(V.normalize(clone(doc)));
  V.ui.tab = 'gym'; V.ui.gymSub = 'rutinas'; V.ui.rutId = rutId; V.ui.rutDayId = dayId;
  return texto(vanillaHTML(V.viewRutinas()));
}

/* RutinaDetailPage y RutinaDayPage leen el id de la URL con useParams(), así que no
   alcanza con montarlas sueltas (como Hoy o Calendario): necesitan una <Route> de verdad
   que les inyecte `:rutId`/`:dayId`, o los parámetros llegan vacíos. */
function rutinasReact(doc, ruta, patron, Componente) {
  const { container } = renderScreen(
    <Routes><Route path={patron} element={<Componente />} /></Routes>,
    { doc: clone(doc), route: ruta },
  );
  return texto(container);
}

describe('Rutinas dice exactamente lo mismo que la app vanilla, en sus tres niveles', () => {
  it('biblioteca, sin rutinas', () => {
    expect(rutinasReact(emptyDoc(), '/gym/rutinas', '/gym/rutinas', RutinasListPage))
      .toBe(rutinasVanilla(emptyDoc()));
  });

  it('biblioteca, con rutinas', () => {
    expect(rutinasReact(fullDoc(), '/gym/rutinas', '/gym/rutinas', RutinasListPage))
      .toBe(rutinasVanilla(fullDoc()));
  });

  it('los días de una rutina', () => {
    expect(rutinasReact(fullDoc(), '/gym/rutinas/r1', '/gym/rutinas/:rutId', RutinaDetailPage))
      .toBe(rutinasVanilla(fullDoc(), { rutId: 'r1' }));
  });

  it('una rutina sin días todavía', () => {
    expect(rutinasReact(fullDoc(), '/gym/rutinas/r2', '/gym/rutinas/:rutId', RutinaDetailPage))
      .toBe(rutinasVanilla(fullDoc(), { rutId: 'r2' }));
  });

  it('los ejercicios de un día', () => {
    expect(rutinasReact(fullDoc(), '/gym/rutinas/r1/d1', '/gym/rutinas/:rutId/:dayId', RutinaDayPage))
      .toBe(rutinasVanilla(fullDoc(), { rutId: 'r1', dayId: 'd1' }));
  });

  it('un día sin ejercicios todavía', () => {
    expect(rutinasReact(fullDoc(), '/gym/rutinas/r1/d2', '/gym/rutinas/:rutId/:dayId', RutinaDayPage))
      .toBe(rutinasVanilla(fullDoc(), { rutId: 'r1', dayId: 'd2' }));
  });
});

/* ---------------------------------------------------------------- Hábitos */
function habitosVanilla(doc, day) {
  V.setState(V.normalize(clone(doc)));
  V.ui.tab = 'habitos'; V.ui.habitDate = day; V.ui.habMenu = null;
  return texto(vanillaHTML(V.viewHabitos()));
}

function habitosReact(doc) {
  const { container } = renderScreen(<HabitosPage />, { doc: clone(doc) });
  /* Rediseño Nocturne: la barra de los últimos 28 días de la mejor racha y la tarjeta
     "Marcas de hoy" son datos nuevos sin equivalente en vanilla. Se sacan; el resto de
     Hábitos sigue comparándose igual. */
  container.querySelectorAll('.beststreak-month, .daysummary').forEach((el) => el.remove());
  return texto(container);
}

describe('Hábitos dice exactamente lo mismo que la app vanilla', () => {
  const casos = {
    'sin hábitos todavía': emptyDoc(),
    'con hábitos y racha': fullDoc(),
  };

  it.each(Object.keys(casos))('%s', (nombre) => {
    expect(habitosReact(casos[nombre])).toBe(habitosVanilla(casos[nombre], TODAY));
  });
});

/* ---------------------------------------------------------------- Progreso */
// Secciones que vanilla sigue teniendo pero React ya no. Las de hábitos son de las
// etapas 6 y 7 (pedido explícito de Lulo de que Progreso gire en torno a entrenamientos:
// primero se recortó a "Cumplimiento de hábitos" nomás, después se sacó ese también).
// "Resumen" es más nueva (pedido explícito: "la pantalla resumen no sirve") — React sacó
// el bloque entero, vanilla lo sigue teniendo. Comparación EXACTA de texto, no startsWith:
// "Rachas de entrenamiento" (Gimnasio, no se toca) también arranca con la palabra "Rachas"
// y no tiene que caer en el mismo corte.
const SIN_EQUIVALENTE_EN_REACT = ['Mapa de hábitos', 'Rachas', 'Frecuencia de entrenamiento', 'Cumplimiento de hábitos', 'Resumen'];

function progresoVanilla(doc, per = 'mes') {
  V.setState(V.normalize(clone(doc)));
  V.ui.tab = 'progreso'; V.ui.progPeriod = per;
  const cont = vanillaHTML(V.viewProgreso());
  cont.querySelectorAll('.sect').forEach((sect) => {
    const label = sect.querySelector('.sectlabel')?.textContent;
    if (SIN_EQUIVALENTE_EN_REACT.includes(label)) sect.remove();
  });
  return texto(cont);
}

// "Cómo venís" (rediseño "Glass + aurora"), "Mapa de entrenamientos" (etapa 7),
// "Frecuencia semanal" y "Cómo comés" (seguimiento de adherencia al plan de comidas) son
// 100% React, vanilla no las tiene, así que se sacan de este lado antes de comparar.
const SIN_EQUIVALENTE_EN_VANILLA = ['Cómo venís', 'Mapa de entrenamientos', 'Frecuencia semanal', 'Cómo comés', '¿Comiste bien?'];

function progresoReact(doc) {
  const { container } = renderScreen(<ProgresoPage />, { doc: clone(doc) });
  container.querySelectorAll('.sect').forEach((sect) => {
    if (SIN_EQUIVALENTE_EN_VANILLA.includes(sect.querySelector('.sectlabel')?.textContent)) sect.remove();
  });
  return texto(container);
}

/* Dos diferencias de texto esperadas, las dos a propósito, las dos se quitan de los dos
   lados antes de comparar (así el resto —nombres, números, qué sección aparece— sigue
   bajo la misma red de seguridad que tenía):

   1. La nota de período ("en los últimos 30 días…"): los períodos de Progreso pasaron de
      ventana móvil a ventana alineada al calendario (pedido explícito — "la semana se
      cuenta como los lunes"), y vanilla sigue con la ventana vieja.

   2. "N sesiones" → "N entrenos" en el encabezado de "Entrenamientos por tipo": contaba
      MÚSCULOS, no entrenos (un turno de bícep+tríceps+hombro sumaba 3), otro pedido
      explícito de Lulo. Con fullDoc() —un solo músculo por turno— el NÚMERO coincide
      igual; lo que cambió es la palabra. */
const NOTAS_PERIODO = [
  'enlosúltimos7días', 'enlosúltimos30días', 'enelúltimoaño',
  'estasemana', 'enlasúltimas4semanas', 'enlosúltimos12meses',
];
function sinNotaPeriodo(s) {
  return NOTAS_PERIODO.reduce((acc, n) => acc.replaceAll(n, ''), s)
    // (texto() ya no deja el "·": el encabezado queda "6entrenosmes" / "6sesionesmes")
    .replace(/(\d+)(entrenos?|sesiones?)(?=mes|semana|año|todo|7|30)/, '$1');
}

describe('Progreso dice exactamente lo mismo que la app vanilla', () => {
  const casos = {
    'cuenta nueva, sin nada': emptyDoc(),
    'con todo cargado (período: mes, el default)': fullDoc(),
  };

  it.each(Object.keys(casos))('%s', (nombre) => {
    expect(sinNotaPeriodo(progresoReact(casos[nombre]))).toBe(sinNotaPeriodo(progresoVanilla(casos[nombre])));
  });
});

/* ---------------------------------------------------------------- clases */
describe('todas las clases que usa React existen en el CSS', () => {
  const raiz = path.resolve(process.cwd(), 'src', 'styles');
  const css = ['styles.css', 'auth.css', 'app.css', 'nocturne.css']
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
    Gimnasio: () => renderScreen(<GymPage />, { doc: fullDoc() }).container,
    'Gimnasio vacío': () => renderScreen(<GymPage />, { doc: emptyDoc() }).container,
    'Rutinas — biblioteca': () => renderScreen(<RutinasListPage />, { doc: fullDoc(), route: '/gym/rutinas' }).container,
    'Rutinas — días': () => renderScreen(
      <Routes><Route path="/gym/rutinas/:rutId" element={<RutinaDetailPage />} /></Routes>,
      { doc: fullDoc(), route: '/gym/rutinas/r1' },
    ).container,
    'Rutinas — ejercicios': () => renderScreen(
      <Routes><Route path="/gym/rutinas/:rutId/:dayId" element={<RutinaDayPage />} /></Routes>,
      { doc: fullDoc(), route: '/gym/rutinas/r1/d1' },
    ).container,
    Hábitos: () => renderScreen(<HabitosPage />, { doc: fullDoc() }).container,
    'Hábitos vacío': () => renderScreen(<HabitosPage />, { doc: emptyDoc() }).container,
    Progreso: () => renderScreen(<ProgresoPage />, { doc: fullDoc() }).container,
    'Progreso vacío': () => renderScreen(<ProgresoPage />, { doc: emptyDoc() }).container,
  };

  it.each(Object.keys(pantallas))('%s', (nombre) => {
    const sinDefinir = usadas(pantallas[nombre]()).filter((c) => !declaradas.has(c));
    expect(sinDefinir).toEqual([]);
  });

  it('los modales de agenda también (se dibujan fuera del contenedor, en el body)', async () => {
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

  it('los modales de Gimnasio, Rutinas y Hábitos también', async () => {
    const { LiftModal } = await import('../components/gym/LiftModal');
    const { LiftDetailModal } = await import('../components/gym/LiftDetailModal');
    const { BodyWeightModal } = await import('../components/gym/BodyWeightModal');
    const { BodyManageModal } = await import('../components/gym/BodyManageModal');
    const { TypesManager } = await import('../components/gym/TypesManager');
    const { ExerciseFormModal } = await import('../components/rutinas/ExerciseFormModal');
    const { SimpleNameModal } = await import('../components/rutinas/SimpleNameModal');
    const { HabitFormModal } = await import('../components/habitos/HabitFormModal');
    const { MemoryRouter } = await import('react-router-dom');
    const { DataContext } = await import('../context/DataContext');
    const { fakeDataStore } = await import('../test/utils');

    const doc = fullDoc();
    const { store } = fakeDataStore({ doc });
    const vacio = () => {};
    render(
      <MemoryRouter>
        <DataContext.Provider value={store}>
          <LiftModal onClose={vacio} />
          <LiftDetailModal lift={doc.gym.lifts[0]} onClose={vacio} onLogWeight={vacio} onEditRecord={vacio} />
          <BodyWeightModal onClose={vacio} />
          <BodyManageModal onClose={vacio} onNew={vacio} onEdit={vacio} />
          <TypesManager onClose={vacio} />
          <ExerciseFormModal onClose={vacio} onSave={vacio} />
          <SimpleNameModal modalTitle="t" editTitle="t" fieldLabel="l" placeholder="p" errorMessage="e" onClose={vacio} onSave={vacio} />
          <HabitFormModal onClose={vacio} />
        </DataContext.Provider>
      </MemoryRouter>,
    );

    const sinDefinir = usadas(document.body).filter((c) => !declaradas.has(c));
    expect(sinDefinir).toEqual([]);
  });
});
