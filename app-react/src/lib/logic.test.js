import { describe, expect, it } from 'vitest';
import { normalize } from './model';
import { habitBestStreak, habitDayMarks, habitDayPossible, habitDone, habitStreak } from './habits';
import { gymGimnasio, gymHistory, gymRanking, gymSessions, gymTypeStreaks, liftGains, bodyList, weekPlanFor } from './gym';
import { agendaDe, pendVisible, pendientes, tareasDe } from './agenda';
import { comoVenis, comoVenisColumns, dayProgress, lastTrained, progHeatmapWindow, progStart, inPeriod } from './progress';
import { addDays, iso, mondayOf, parseISO, todayD } from './dates';
import { TODAY, YESTERDAY, TOMORROW, ago, thisMonday, mondayAgo, fullDoc, emptyDoc } from '../test/fixtures';

/* Los tests de compat/ prueban que React da lo MISMO que la app vanilla. Estos prueban
   que ese resultado además es el CORRECTO, con números escritos a mano.

   La diferencia importa: si un día alguien cambia una fórmula en los dos lados a la vez,
   los diferenciales seguirían en verde y estos no. Son la red que atrapa eso. */

const doc = () => normalize(fullDoc());

describe('rachas de hábitos', () => {
  it('h2 (1 vez por día) viene completo hoy, ayer, anteayer y hace 3 días: racha de 4', () => {
    expect(habitStreak(doc(), 'h2')).toBe(4);
  });

  it('h1 (3 veces por día) hoy va 2 de 3, así que la racha se cuenta desde ayer: 2', () => {
    // ayer 3/3, anteayer 3/3, hace 3 días 1/3 → corta ahí.
    expect(habitStreak(doc(), 'h1')).toBe(2);
  });

  it('un día incompleto no cuenta para la racha', () => {
    expect(habitDone(doc(), 'h1', ago(3))).toBe(false);
    expect(habitDone(doc(), 'h1', ago(2))).toBe(true);
  });

  it('el récord de h2 es 4 (hoy y los tres días anteriores)', () => {
    expect(habitBestStreak(doc(), 'h2')).toBe(4);
  });

  it('un día suelto viejo no extiende el récord', () => {
    // h2 tiene también una marca hace 9 días, aislada.
    expect(habitBestStreak(doc(), 'h2')).toBe(4);
  });

  it('sin marcas, la racha es 0', () => {
    expect(habitStreak(normalize(emptyDoc()), 'x')).toBe(0);
  });

  it('las marcas posibles del día suman el timesPerDay de cada hábito', () => {
    expect(habitDayPossible(doc())).toBe(4);   // h1 (3) + h2 (1)
  });

  it('las marcas hechas se recortan al máximo del hábito', () => {
    const d = normalize({
      habits: [{ id: 'h', name: 'x', timesPerDay: 1 }],
      habitLog: { [TODAY]: { h: 5 } },   // quedó de cuando el hábito era de 5 veces
    });
    expect(habitDayMarks(d, TODAY)).toBe(1);
  });
});

describe('gimnasio', () => {
  it('el historial tiene 6 sesiones (los días marcados que no son descanso)', () => {
    expect(gymHistory(doc())).toHaveLength(6);
  });

  it('el día de Descanso marcado como hecho no entra', () => {
    expect(gymHistory(doc()).every((s) => s.type !== 'Descanso')).toBe(true);
  });

  it('viene del más nuevo al más viejo', () => {
    const h = gymHistory(doc());
    expect(h[0].date >= h[h.length - 1].date).toBe(true);
  });

  it('el ranking cuenta 3 de Pecho y 3 de Espalda', () => {
    const conteos = Object.fromEntries(gymRanking(gymHistory(doc())).map((r) => [r.type, r.count]));
    expect(conteos).toEqual({ Pecho: 3, Espalda: 3 });
  });

  it('Pecho lleva 2 semanas seguidas; Espalda, 3', () => {
    const rachas = gymTypeStreaks(doc());
    expect(rachas.find((r) => r.type === 'Espalda').weeks).toBe(3);
    expect(rachas.find((r) => r.type === 'Pecho').weeks).toBe(2);
  });

  /* Pedido explícito: "si un día hago bicep y tricep y hombro eso es un entreno, no 3".
     gymHistory() cuenta por MÚSCULO (correcto para el ranking, las rachas, "Cómo venís");
     gymSessions() cuenta SESIONES (correcto para "cuántas veces entrené") — un mismo turno
     con 3 músculos suma 3 en el primero y 1 en el segundo. Dos turnos el mismo día (uno a
     la mañana, otro a la tarde) SÍ son 2 sesiones: eso no cambió desde la etapa 6. */
  describe('gymSessions: un turno con varios músculos es UN entreno', () => {
    function docMultiMusculo() {
      const d = normalize(emptyDoc());
      d.gym.weekPlans[thisMonday] = [
        { muscles: ['Bicep', 'Tricep', 'Hombro'], done: true },
        { muscles: [], done: false },
        { muscles: ['Pecho'], done: true, muscles2: ['Espalda'], done2: true },
        ...Array.from({ length: 4 }, () => ({ muscles: [], done: false })),
      ];
      return d;
    }

    it('un turno de 3 músculos aporta 3 entradas a gymHistory() pero 1 a gymSessions()', () => {
      const d = docMultiMusculo();
      const lunes = gymHistory(d).filter((x) => x.date === thisMonday);
      const sesionesLunes = gymSessions(d).filter((x) => x.date === thisMonday);
      expect(lunes).toHaveLength(3);
      expect(sesionesLunes).toHaveLength(1);
    });

    it('dos turnos el mismo día siguen siendo 2 sesiones (no se funden en 1)', () => {
      const d = docMultiMusculo();
      const miercoles = gymSessions(d).filter((x) => x.date === iso(addDays(parseISO(thisMonday), 2)));
      expect(miercoles).toHaveLength(2);
    });

    it('el total de sesiones de la semana es 3 (lunes 1 + miércoles 2), no 5 músculos', () => {
      const d = docMultiMusculo();
      const total = gymSessions(d).filter((x) => x.date >= thisMonday && x.date <= iso(addDays(parseISO(thisMonday), 6)));
      expect(total).toHaveLength(3);
    });
  });

  /* Pedido explícito, segunda vuelta: "los abdominales no cuentan como entrenamientos".
     gymHistory() sigue sumando abs como un músculo más (ranking, Cómo venís, frecuencia
     por músculo no cambian), pero gymSessions() —la cuenta de "cuántas veces entrené"— ya
     no lo incluye. */
  describe('gymSessions: abs no cuenta como entreno', () => {
    it('un día con solo abs marcado no aporta ninguna sesión', () => {
      const d = normalize(emptyDoc());
      d.gym.weekPlans[thisMonday] = [
        { muscles: [], done: false, absCategories: ['core'] },
        ...Array.from({ length: 6 }, () => ({ muscles: [], done: false })),
      ];
      expect(gymSessions(d)).toEqual([]);
      expect(gymHistory(d)).toHaveLength(1); // sigue contando para lo demás
    });

    it('un día con turno de músculo Y abs aporta una sola sesión (la del turno)', () => {
      const d = normalize(emptyDoc());
      d.gym.weekPlans[thisMonday] = [
        { muscles: ['Pecho'], done: true, absCategories: ['core'] },
        ...Array.from({ length: 6 }, () => ({ muscles: [], done: false })),
      ];
      expect(gymSessions(d)).toHaveLength(1);
      expect(gymHistory(d)).toHaveLength(2); // Pecho + Abs, los dos por separado
    });
  });

  it('la racha se ordena de mayor a menor', () => {
    expect(gymTypeStreaks(doc())[0].type).toBe('Espalda');
  });

  it('el avance de carga se mide del primer al último registro de la ventana', () => {
    const g = liftGains(doc(), null).find((x) => x.id === 'l1');
    expect(g).toMatchObject({ from: 60, to: 72.5, gain: 12.5, n: 3 });
  });

  it('un ejercicio con un solo registro queda afuera (no hay con qué comparar)', () => {
    expect(liftGains(doc(), null).some((g) => g.id === 'l2')).toBe(false);
  });

  it('acotando la ventana cambian los números', () => {
    const g = liftGains(doc(), ago(15)).find((x) => x.id === 'l1');
    expect(g).toMatchObject({ from: 70, to: 72.5, gain: 2.5, n: 2 });
  });

  it('el peso corporal sale ordenado del más viejo al más nuevo', () => {
    expect(bodyList(doc()).map((r) => r.kg)).toEqual([73, 72.5, 71.8]);
  });

  it('una semana sin plan devuelve 7 días de descanso', () => {
    const plan = weekPlanFor(normalize(emptyDoc()), 0);
    expect(plan).toHaveLength(7);
    expect(plan.every((d) => d.muscles.length === 0 && d.done === false)).toBe(true);
  });

  it('las claves de las semanas son lunes', () => {
    expect(new Date(thisMonday + 'T00:00:00').getDay()).toBe(1);
    expect(new Date(mondayAgo(2) + 'T00:00:00').getDay()).toBe(1);
  });
});

describe('agenda', () => {
  it('las tareas de hoy son 2, ordenadas por hora', () => {
    expect(tareasDe(doc(), TODAY).map((t) => t.title)).toEqual(['Tarea de hoy', 'Tarea de hoy hecha']);
  });

  it('una tarea vencida se queda en su fecha, no se arrastra a hoy', () => {
    expect(tareasDe(doc(), TODAY).some((t) => t.title === 'Tarea vencida')).toBe(false);
    expect(tareasDe(doc(), ago(40))).toHaveLength(1);
  });

  it('las tareas sin hora van después de las que tienen hora', () => {
    const conHora = tareasDe(doc(), TODAY).findIndex((t) => t.time === '09:00');
    const sinHora = tareasDe(doc(), TODAY).findIndex((t) => t.time === null);
    expect(conHora).toBeLessThan(sinHora);
  });

  it('la agenda de hoy trae la cita y la fecha anual', () => {
    expect(agendaDe(doc(), TODAY).map((e) => e.kind).sort()).toEqual(['anual', 'cita']);
  });

  it('la fecha anual NO aparece en otro día', () => {
    expect(agendaDe(doc(), TOMORROW).some((e) => e.kind === 'anual')).toBe(false);
  });

  it('la bandeja tiene las 2 tareas sin fecha', () => {
    expect(pendientes(doc())).toHaveLength(2);
  });

  it('una pendiente completada ayer se ve ayer y no hoy', () => {
    const p = pendientes(doc()).find((t) => t.title === 'Pendiente completada');
    expect(pendVisible(p, YESTERDAY)).toBe(true);
    expect(pendVisible(p, TODAY)).toBe(false);
  });

  it('una pendiente sin completar se ve siempre', () => {
    const p = pendientes(doc()).find((t) => t.title === 'Tarea sin fecha');
    expect(pendVisible(p, TODAY)).toBe(true);
    expect(pendVisible(p, ago(100))).toBe(true);
  });
});

describe('progreso del día', () => {
  it('mezcla tareas y marcas de hábitos en un solo porcentaje', () => {
    // hoy: 2 tareas (1 hecha) + 4 marcas posibles (3 hechas) = 4 de 6 → 67%
    expect(dayProgress(doc(), TODAY)).toEqual({ done: 4, total: 6, pct: 67 });
  });

  it('un día sin nada da 0% y no rompe con la división', () => {
    expect(dayProgress(normalize(emptyDoc()), TODAY)).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

/* Alineados al calendario (pedido explícito: "la semana se cuenta como los lunes"), no a
   ventana móvil — "semana" es ESTA semana, no los últimos 7 días corridos. Mismo criterio
   que ya usaba "Cómo venís" (comoVenisColumns en este mismo archivo, más abajo), así que
   el número de Progreso y el de "Cómo venís" miden exactamente lo mismo período. */
describe('períodos (alineados al lunes)', () => {
  it('"semana" arranca el lunes de esta semana', () => {
    expect(progStart('semana')).toBe(thisMonday);
  });

  it('"mes" arranca el lunes de hace 3 semanas (4 semanas completas, incluida la actual)', () => {
    expect(progStart('mes')).toBe(mondayAgo(3));
  });

  it('"año" arranca el 1º del mes, hace 11 meses (12 meses completos, incluido el actual)', () => {
    const t = todayD();
    const inicio = new Date(t.getFullYear(), t.getMonth() - 11, 1);
    expect(progStart('ano')).toBe(iso(inicio));
  });

  it('"todo" no tiene fecha de inicio', () => {
    expect(progStart('todo')).toBeNull();
  });

  it('sin fecha de inicio, todo entra en el período', () => {
    expect(inPeriod(ago(9999), null)).toBe(true);
  });

  it('el borde de la ventana entra: el lunes sí, el domingo anterior no', () => {
    expect(inPeriod(thisMonday, progStart('semana'))).toBe(true);
    expect(inPeriod(iso(addDays(parseISO(thisMonday), -1)), progStart('semana'))).toBe(false);
  });

  /* Pedido explícito: "todos los gráficos deben tomar la misma medida de tiempo que como
     venís" — el mapa de entrenamientos ya no recorta su propia ventana de 8-26 semanas
     (progWeekWindow), arranca en la misma columna que "Cómo venís" para cada período. */
  describe('progHeatmapWindow mide lo mismo que "Cómo venís"', () => {
    it('"mes" son 4 semanas, no el mínimo de 8 que usaba antes', () => {
      expect(progHeatmapWindow('mes').weeks).toBe(4);
    });

    it('"semana" es 1 sola semana', () => {
      expect(progHeatmapWindow('semana').weeks).toBe(1);
    });

    it('arranca en el lunes de la primera columna de comoVenisColumns, para cualquier período', () => {
      ['semana', 'mes', 'ano', 'todo'].forEach((per) => {
        const { cols } = comoVenisColumns(per);
        expect(iso(progHeatmapWindow(per).from)).toBe(iso(mondayOf(parseISO(cols[0].from))));
      });
    });
  });
});

/* Regularidad por ratio (pedido explícito, segunda vuelta: "buscale otro termino a cada
   regularidad" — Regular/Aceptable/Irregular/Insuficiente en vez de
   Constante/Irregular/"Sin hacer N ..."). Se prueba con per='mes': sus 4 columnas
   semanales (mondayAgo(3..0), la última siempre la semana actual) coinciden letra por
   letra con el ejemplo que dio Lulo ("hice 2/4 y eso es irregular").

   Tercera vuelta, pedido explícito ("el seguimiento en como vas tambien debe tomar esta
   semana porq hay algunos que hice 2/4 y eso es irregular"): la semana actual (mondayAgo(0))
   CUENTA para el ratio — antes se excluía ("está en curso"), y por eso un 2/4 real daba
   un balde más optimista (o directamente "SIN ENTRENAR" si las 2 veces incluían la
   actual) hasta que la semana terminara. */
describe('comoVenis: regularidad por ratio (cuenta la semana actual)', () => {
  function docConPechoEnSemanas(semanasAtras) {
    const d = normalize(emptyDoc());
    d.gym.customTypes = [{ id: 'ct1', name: 'Pecho', color: '#FF9B93' }];
    semanasAtras.forEach((n) => {
      d.gym.weekPlans[mondayAgo(n)] = [{ muscles: ['Pecho'], done: true }, ...Array.from({ length: 6 }, () => ({ muscles: [], done: false }))];
    });
    return d;
  }

  function statusDePecho(semanasAtras) {
    return comoVenis(docConPechoEnSemanas(semanasAtras), 'mes').rows.find((r) => r.name === 'Pecho').status.label;
  }

  it('0 de 4 semanas (ninguna, ni la actual) → "SIN ENTRENAR"', () => {
    expect(statusDePecho([])).toBe('SIN ENTRENAR');
  });

  it('entrenar SOLO esta semana (1 de 4) ya da "INSUFICIENTE", no "SIN ENTRENAR"', () => {
    // Este es justo el caso que reportó Lulo: antes, la semana en curso no entraba en la
    // cuenta, así que entrenar solo hoy/esta semana todavía se veía como "sin entrenar".
    expect(statusDePecho([0])).toBe('INSUFICIENTE');
  });

  it('2 de 4, contando esta semana → "IRREGULAR"', () => {
    expect(statusDePecho([0, 1])).toBe('IRREGULAR');
  });

  it('2 de 4 sin la semana actual (las dos anteriores) también da "IRREGULAR" — es el mismo ratio', () => {
    expect(statusDePecho([1, 2])).toBe('IRREGULAR');
  });

  it('3 de 4 → "ACEPTABLE"', () => {
    expect(statusDePecho([0, 1, 2])).toBe('ACEPTABLE');
  });

  it('4 de 4 (las cuatro semanas, incluida la actual) → "REGULAR"', () => {
    expect(statusDePecho([0, 1, 2, 3])).toBe('REGULAR');
  });
});

/* Rediseño Nocturne: los períodos de 3 y 6 meses y "Último entreno". */
describe('3 y 6 meses (rediseño Nocturne)', () => {
  it('3 meses son 13 semanas desde el lunes; 6 meses arrancan el 1º del mes, 5 meses atrás', () => {
    const t = todayD();
    expect(progStart('3m')).toBe(iso(addDays(mondayOf(t), -84)));
    expect(progStart('6m')).toBe(iso(new Date(t.getFullYear(), t.getMonth() - 5, 1)));
  });

  it('"Cómo venís": 3 meses = 13 columnas semanales, 6 meses = 6 mensuales; la última es la actual', () => {
    const c3 = comoVenisColumns('3m'), c6 = comoVenisColumns('6m');
    expect(c3.cols).toHaveLength(13);
    expect(c3.current).toBe(12);
    expect(c3.cols[0].from).toBe(progStart('3m'));
    expect(c6.cols).toHaveLength(6);
    expect(c6.current).toBe(5);
    expect(c6.cols[5].from).toBe(iso(new Date(todayD().getFullYear(), todayD().getMonth(), 1)));
  });
});

describe('lastTrained: "Último entreno"', () => {
  it('mira tres semanas de siete días, las dos anteriores y la actual', () => {
    const v = lastTrained(normalize(fullDoc()));
    expect(v.weekHeads).toHaveLength(3);
    expect(v.weekHeads[2].current).toBe(true);
    v.rows.forEach((r) => {
      expect(r.weeks).toHaveLength(3);
      r.weeks.forEach((w) => expect(w).toHaveLength(7));
    });
  });

  it('lo que no se entrenó en las tres semanas va primero (ago = null), después de más viejo a más nuevo', () => {
    const { rows } = lastTrained(normalize(fullDoc()));
    const agos = rows.map((r) => (r.ago === null ? Infinity : r.ago));
    expect(agos).toEqual([...agos].sort((a, b) => b - a));
  });
});

/* Gimnasio: qué es "un entreno" y qué cuenta como "ir al gimnasio". */
describe('entrenos y gimnasio', () => {
  const doc = (turnos) => {
    const d = normalize(emptyDoc());
    d.gym.weekPlans[thisMonday] = turnos.concat(Array.from({ length: 7 - turnos.length }, () => ({ muscles: [], done: false })));
    return d;
  };

  it('bíceps + tríceps + abs el mismo día es UN entreno (los músculos y el abs no multiplican)', () => {
    const d = doc([{ muscles: ['Bíceps', 'Tríceps'], done: true, absCategories: ['core'] }]);
    expect(gymSessions(d)).toHaveLength(1);
  });

  it('un doble turno cuenta como DOS entrenos', () => {
    const d = doc([{ muscles: ['Pecho'], done: true, muscles2: ['Espalda'], done2: true }]);
    expect(gymSessions(d)).toHaveLength(2);
  });

  it('"Gimnasio" cuenta todo menos fútbol y cardio (que sí son entrenos)', () => {
    const d = doc([
      { muscles: ['Pecho'], done: true },
      { muscles: ['Fútbol'], done: true },
      { muscles: ['Cardio'], done: true },
      { muscles: ['Piernas', 'Cardio'], done: true },
    ]);
    expect(gymSessions(d)).toHaveLength(4);
    expect(gymGimnasio(d)).toHaveLength(2); // pecho, y piernas + cardio
  });

  it('la cifra GIMNASIO de "Cómo venís" las cuenta y da su promedio', () => {
    const d = doc([{ muscles: ['Pecho'], done: true }, { muscles: ['Fútbol'], done: true }]);
    const stats = Object.fromEntries(comoVenis(d, 'mes').stats.map((s) => [s.k, s.v]));
    expect(stats.ENTRENOS).toBe('2');
    expect(stats.GIMNASIO).toMatch(/^1 · 0,3\/sem$/); // 1 en 4 semanas
  });
});
