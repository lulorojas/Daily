const { boot, bootAuth, bootFs, ok, done, d, iso, TODAY, TOMORROW, ANUAL_DATE, ago, V1_RAW } = require('./harness');

/* =================== REGRESIÓN etapas 1–3.5 =================== */
console.log('\nR. Regresión de las etapas anteriores');
{
  const w = boot(V1_RAW, null);
  const s = JSON.parse(w.localStorage.getItem('daily.v2'));
  const by = t => s.items.find(x => x.title === t);

  // etapa 1: migración + daily.v1 intacta
  ok('daily.v1 queda intacta (byte a byte)', w.localStorage.getItem('daily.v1') === V1_RAW);
  ok('migra las 8 items sin perder nada',    s.items.length === 8);
  ok('tarea sin fecha → date null',          by('Tarea sin fecha').kind==='tarea' && by('Tarea sin fecha').date===null);
  ok('tarea con hora conserva hora y done',  by('Tarea con hora').time==='14:30' && by('Tarea con hora').done===true);
  ok('puntual → cita, anual → anual',        by('Dentista').kind==='cita' && by('Cumple de Ana').kind==='anual');
  ok('citas/anuales sin estado',             !('done' in by('Dentista')) && !('done' in by('Cumple de Ana')));

  // etapa 1: agenda deriva bien; vencida no se arrastra a hoy
  ok('tareasDe(hoy) = 2',      w.tareasDe(TODAY).length === 2);
  ok('agendaDe(hoy) = 3',      w.agendaDe(TODAY).length === 3);
  ok('la vencida no está en hoy', !w.tareasDe(TODAY).some(x=>x.title==='Tarea vencida'));
  ok('la vencida sigue en su fecha', w.tareasDe('2020-01-05').length === 1);
  ok('pendientes = 1 sin fecha', w.pendientes().length === 1);

  // vistas de todas las pestañas
  for (const [tab, marca] of [['hoy','Sin fecha'],['calendario','Citas'],['gym','Plan semanal'],['habitos','Hábitos'],['progreso','Resumen']]) {
    w.ev('ui').tab = tab; w.ev('ui').hoySub = null; w.render();
    ok('render "'+tab+'"', w.document.getElementById('app').innerHTML.includes(marca));
  }
  // 5 pestañas, sin "tareas"
  w.ev('ui').tab='hoy'; w.render();
  ok('5 pestañas, sin Tareas', (w.document.getElementById('app').innerHTML.match(/data-act="tab"/g)||[]).length===5 && !w.document.getElementById('app').innerHTML.includes('data-tab="tareas"'));

  // validación etapa 1
  w.taskModal(null, TODAY);
  w.document.querySelector('[data-act="modal-save"]').click();
  ok('tarea sin título avisa y no guarda', w.overlay ? true : (w.document.querySelectorAll('.ferr').length===1 && w.document.getElementById('overlay').classList.contains('show')));
  w.closeModal();
}
{
  // etapa 2: rutinas + peso corporal
  const w = boot(null, null);
  const s = w.ev('state');
  ok('gym.routines vacía al arrancar', Array.isArray(s.gym.routines) && s.gym.routines.length===0);
  ok('gym.bodyWeights vacía al arrancar', Array.isArray(s.gym.bodyWeights) && s.gym.bodyWeights.length===0);
  s.gym.routines.push({ id:'R', name:'R1', days:[{ id:'D', name:'Pecho', exercises:[{ id:'E', name:'Press', detail:'4x8' }] }] });
  s.gym.bodyWeights.push({ id:'B1', kg:72.5, date:ago(3) }, { id:'B2', kg:72, date:TODAY });
  w.ev('ui').tab='gym'; w.ev('ui').gymSub='rutinas'; w.render();
  ok('rutinas renderiza', w.document.getElementById('app').innerHTML.includes('Mis rutinas'));
  w.ev('ui').gymSub=null; w.render();
  ok('sección peso corporal', w.document.getElementById('app').innerHTML.includes('Peso corporal'));
  ok('sparkline existe', typeof w.ev('sparkline')==='function' && w.ev('sparkline([1,2,3],"#fff",100,40)').includes('<path'));
  ok('sparkline serie vacía no rompe', w.ev('sparkline([],"#fff",100,40)').includes('<svg'));
}
{
  // etapa 3 + 3.5: progreso read-only + helpers
  const w = boot(V1_RAW, null);
  ok('gymRanking existe', typeof w.ev('gymRanking')==='function');
  ok('gymTypeStreaks existe', typeof w.ev('gymTypeStreaks')==='function');
  ok('liftGains existe', typeof w.ev('liftGains')==='function');
  ok('habitBestStreak existe', typeof w.ev('habitBestStreak')==='function');
  ok('donut existe', typeof w.ev('donut')==='function');
  ok('donut vacío devuelve ""', w.ev('donut([],100,10)')==='' && w.ev('donut([{value:0,color:"#fff"}],100,10)')==='');

  w.ev('ui').tab='progreso';
  const stAntes = JSON.stringify(w.ev('state'));
  const lsAntes = w.localStorage.getItem('daily.v2');
  for (const p of ['semana','mes','ano','todo']) { w.ev('ui').progPeriod=p; w.render(); }
  ok('progreso no toca el estado', JSON.stringify(w.ev('state'))===stAntes);
  ok('progreso no toca localStorage', w.localStorage.getItem('daily.v2')===lsAntes);
  const h = w.document.getElementById('app').innerHTML;
  ok('tablero con los 7 bloques', ['Resumen','Peso corporal','Frecuencia de entrenamiento','Balance muscular','Progreso de carga','Mapa de hábitos','Cumplimiento de hábitos'].every(x=>h.includes(x)));
}

/* =================== ETAPA 4 =================== */

// jsdom no implementa createObjectURL ni la descarga: se stubean para observar el <a>.
function bootBk(seedV1, seedV2, bkMetaRaw) {
  const b = boot(seedV1, seedV2);
  if (bkMetaRaw) b.localStorage.setItem('daily.backup', bkMetaRaw);
  b.URL.createObjectURL = () => 'blob:fake';
  b.URL.revokeObjectURL = () => {};
  b.anchors = [];
  const orig = b.document.createElement.bind(b.document);
  b.document.createElement = tag => { const el = orig(tag); if (tag === 'a' || tag === 'input') b.anchors.push(el); return el; };
  return b;
}

/* ---------- 25. exportar ---------- */
console.log('\n25. Exportar');
try {
  const wb = bootBk(V1_RAW, null);
  const p = wb.backupPayload();
  ok('el backup declara la app',        p.app === 'daily');
  ok('el format sigue al esquema (2)',  p.format === 2 && p.format === wb.ev('state').v);
  ok('trae fecha de exportación ISO',   typeof p.exportedAt === 'string' && !isNaN(new Date(p.exportedAt).getTime()));
  ok('los datos van bajo data',         p.data && Array.isArray(p.data.items));
  ok('el backup incluye la agenda',     p.data.items.length === wb.ev('state').items.length);
  ok('el backup incluye hábitos y log', Array.isArray(p.data.habits) && typeof p.data.habitLog === 'object');
  ok('el backup incluye el gimnasio',   p.data.gym && Array.isArray(p.data.gym.lifts) && p.data.gym.weekPlans && typeof p.data.gym.weekPlans === 'object');
  ok('el backup incluye rutinas',       Array.isArray(p.data.gym.routines));
  ok('el backup incluye peso corporal', Array.isArray(p.data.gym.bodyWeights));
  ok('el backup incluye los tipos',     Array.isArray(p.data.gym.customTypes));
  ok('el backup es serializable',       typeof JSON.stringify(p) === 'string');
  ok('el backup NO trae metadatos del dispositivo', !('lastExport' in p.data) && !p.data.config);
} catch (e) { ok('payload del export', false, e.message); }

try {
  const wb = bootBk(V1_RAW, null);
  const ok1 = wb.doExport();
  const a = wb.anchors.filter(x => x.tagName === 'A').pop();
  ok('doExport devuelve true',        ok1 === true);
  ok('el archivo se llama fijo',      a && a.download === 'daily-backup.json');
  ok('descarga un blob',              a && a.href.startsWith('blob:'));
  ok('guarda la fecha del export',    !!JSON.parse(wb.localStorage.getItem('daily.backup')).lastExport);
  ok('exportar no toca daily.v1',     wb.localStorage.getItem('daily.v1') === V1_RAW);
} catch (e) { ok('doExport', false, e.message); }

/* ---------- 26. round-trip ---------- */
console.log('\n26. Round-trip export → modificar → import');
try {
  const wrt = bootBk(V1_RAW, null);
  const s = wrt.ev('state');
  s.gym.routines.push({ id:'R1', name:'Rutina 1', days:[{ id:'D1', name:'Pecho', exercises:[{ id:'E1', name:'Press', detail:'4x8-12' }] }] });
  s.gym.bodyWeights.push({ id:'BW', kg:72.5, date:TODAY });
  s.habits.push({ id:'HX', name:'Leer', detail:'', color:'#C77DFF', icon:'libro', timesPerDay:1 });
  s.habitLog[TODAY] = Object.assign(s.habitLog[TODAY] || {}, { HX:1 });
  wrt.save();

  const json = JSON.stringify(wrt.backupPayload());
  const antes = JSON.stringify(wrt.ev('state'));

  const s2 = wrt.ev('state');
  s2.items = []; s2.habits = []; s2.habitLog = {};
  s2.gym.routines = []; s2.gym.bodyWeights = []; s2.gym.lifts = [];
  wrt.save();
  ok('los datos quedaron destruidos', JSON.stringify(wrt.ev('state')) !== antes);

  wrt.importFromText(json);
  ok('import pide confirmación', wrt.document.querySelector('[data-act="confirm-yes"]') !== null);
  ok('antes de confirmar no toca nada', wrt.ev('state').items.length === 0);
  wrt.document.querySelector('[data-act="confirm-yes"]').click();

  ok('round-trip: el estado vuelve exacto',   JSON.stringify(wrt.ev('state')) === antes);
  ok('round-trip: persiste en daily.v2',      wrt.localStorage.getItem('daily.v2') === antes);
  ok('round-trip: vuelven las rutinas',       wrt.ev('state').gym.routines[0].days[0].exercises[0].detail === '4x8-12');
  ok('round-trip: vuelve el peso corporal',   wrt.ev('state').gym.bodyWeights[0].kg === 72.5);
  ok('round-trip: vuelven hábitos y marcas',  wrt.ev('state').habits.some(h => h.id === 'HX') && wrt.ev('state').habitLog[TODAY].HX === 1);
  ok('round-trip: vuelven las cargas',        wrt.ev('state').gym.lifts.length > 0);
  ok('import no toca daily.v1',               wrt.localStorage.getItem('daily.v1') === V1_RAW);
  ok('vuelve a Hoy tras importar', wrt.ev('ui').hoySub === null);
  ok('la vista se rehizo con los datos', wrt.document.getElementById('app').innerHTML.length > 500);
} catch (e) { ok('round-trip', false, e.message); }

try {
  const wc = bootBk(V1_RAW, null);
  const antes = JSON.stringify(wc.ev('state'));
  wc.importFromText(JSON.stringify({ app:'daily', format:2, exportedAt:new Date().toISOString(), data:{ v:2, items:[], habits:[], habitLog:{}, gym:{} } }));
  wc.document.querySelector('[data-act="confirm-no"]').click();
  ok('cancelar no reemplaza nada', JSON.stringify(wc.ev('state')) === antes);
  ok('cancelar cierra el cartel',  wc.document.querySelector('[data-act="confirm-yes"]') === null);
} catch (e) { ok('cancelar import', false, e.message); }

/* ---------- 27. archivos inválidos ---------- */
console.log('\n27. Import de archivos inválidos');
const malos = [
  ['no es JSON',              'esto no es json {{{',                                        'no es un JSON válido'],
  ['JSON pero es un número',  '42',                                                         'formato de un backup'],
  ['JSON pero es un array',   '[1,2,3]',                                                    'formato de un backup'],
  ['objeto vacío',            '{}',                                                         'no es un backup de Daily'],
  ['de otra app',             '{"app":"otra","format":2,"data":{}}',                        'no es un backup de Daily'],
  ['sin format',              '{"app":"daily","data":{"items":[]}}',                        'falta la versión del formato'],
  ['format futuro',           '{"app":"daily","format":99,"data":{"items":[]}}',            'otra versión de la app'],
  ['sin data',                '{"app":"daily","format":2}',                                 'no trae datos'],
  ['data no es objeto',       '{"app":"daily","format":2,"data":"hola"}',                   'no trae datos'],
  ['sin items',               '{"app":"daily","format":2,"data":{"habits":[]}}',            'falta la agenda'],
  ['items no es array',       '{"app":"daily","format":2,"data":{"items":"x"}}',            'falta la agenda'],
  ['sin hábitos',             '{"app":"daily","format":2,"data":{"items":[]}}',             'faltan los hábitos'],
  ['sin gym',                 '{"app":"daily","format":2,"data":{"items":[],"habits":[],"habitLog":{}}}', 'falta el gimnasio'],
  ['archivo vacío',           '',                                                           'no es un JSON válido'],
];
try {
  const wi = bootBk(V1_RAW, null);
  const antes = JSON.stringify(wi.ev('state'));
  const lsAntes = wi.localStorage.getItem('daily.v2');
  for (const [label, txt, esperado] of malos) {
    const r = wi.validateBackup(txt);
    ok('rechaza: ' + label, r.ok === false && r.msg.includes(esperado), 'msg: ' + (r.msg || '(sin msg)'));
  }
  for (const [label, txt] of malos) {
    const res = wi.importFromText(txt);
    const cartel = wi.document.querySelector('[data-act="notice-ok"]');
    ok('import inválido avisa (' + label + ')', res === false && cartel !== null);
    ok('import inválido no pide confirmación (' + label + ')', wi.document.querySelector('[data-act="confirm-yes"]') === null);
    if (cartel) cartel.click();
  }
  ok('ningún inválido tocó el estado',    JSON.stringify(wi.ev('state')) === antes);
  ok('ningún inválido tocó daily.v2',     wi.localStorage.getItem('daily.v2') === lsAntes);
  ok('ningún inválido tocó daily.v1',     wi.localStorage.getItem('daily.v1') === V1_RAW);
} catch (e) { ok('archivos inválidos', false, e.message); }

try {
  const wm = bootBk(null, null);
  wm.importFromText('{"app":"daily","format":2,"exportedAt":"2026-01-01T00:00:00.000Z","data":{"v":2,"items":[],"habits":[],"habitLog":{},"gym":{}}}');
  wm.document.querySelector('[data-act="confirm-yes"]').click();
  const g = wm.ev('state').gym;
  ok('un backup mínimo se normaliza', Array.isArray(g.routines) && Array.isArray(g.bodyWeights) && Array.isArray(g.customTypes) && !!g.weekPlans);
  wm.ev('ui').tab = 'gym'; wm.render();
  ok('y la app renderiza igual', wm.document.getElementById('app').innerHTML.includes('Plan semanal'));
} catch (e) { ok('backup mínimo', false, e.message); }

/* ---------- 28. aviso de backup ---------- */
console.log('\n28. Aviso de backup semanal');
const hace = n => new Date(d.getTime() - n*86400000).toISOString();
// Con el sembrado eliminado, una cuenta arranca vacía y el aviso de backup no aplica (no hay
// nada que perder). Estos tests son sobre el *tiempo* del aviso, así que le damos un dato.
const V2D = JSON.stringify({ v:2, items:[{ id:'bkd', kind:'tarea', title:'algo', desc:'', date:null, time:null, done:false }], habits:[], habitLog:{}, gym:{} });
try {
  const w1 = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(60), lastExport:hace(2) }));
  ok('hace 2 días: no avisa', w1.bkShouldWarn() === false);
  const w2 = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(60), lastExport:hace(6) }));
  ok('hace 6 días: no avisa', w2.bkShouldWarn() === false);
  const w3 = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(60), lastExport:hace(7) }));
  ok('hace 7 días: avisa', w3.bkShouldWarn() === true);
  const w4 = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(60), lastExport:hace(30) }));
  ok('hace 30 días: avisa', w4.bkShouldWarn() === true);
  const w5 = bootBk(null, V2D, JSON.stringify({ firstSeen:new Date().toISOString() }));
  ok('nunca exportó pero recién instalada: no molesta', w5.bkShouldWarn() === false);
  const w6 = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(10) }));
  ok('nunca exportó y hace 10 días: avisa', w6.bkShouldWarn() === true);
  ok('el texto lo dice', w6.bkWarnText().includes('Todavía no hiciste ningún backup'));
  ok('con lastExport dice hace cuánto', w4.bkWarnText().includes('30 días'));
} catch (e) { ok('cuándo avisa', false, e.message); }

try {
  const w0 = bootBk(null, null, JSON.stringify({ firstSeen:hace(90) }));
  const s = w0.ev('state');
  s.items = []; s.habits = []; s.habitLog = {};
  s.gym.lifts = []; s.gym.routines = []; s.gym.bodyWeights = [];
  ok('sin datos que perder: no avisa', w0.bkShouldWarn() === false);
  s.items.push({ id:'q', kind:'tarea', title:'x', desc:'', date:null, time:null, done:false });
  ok('con un dato: ya avisa', w0.bkShouldWarn() === true);
} catch (e) { ok('aviso sin datos', false, e.message); }

try {
  const wb = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(60), lastExport:hace(9) }));
  wb.ev('ui').tab = 'hoy'; wb.render();
  const h = wb.document.getElementById('app').innerHTML;
  ok('el banner sale en Hoy',            h.includes('data-act="bk-export"') && h.includes('9 días'));
  ok('el banner no bloquea la vista',    h.includes('data-act="day-sel"') && h.includes('Sin fecha'));
  ok('el banner se puede posponer',      h.includes('data-act="bk-snooze"'));
  wb.document.querySelector('[data-act="bk-export"]').click();
  ok('exportar desde el banner resetea', wb.bkShouldWarn() === false);
  ok('y el banner desaparece',           !wb.document.getElementById('app').innerHTML.includes('data-act="bk-export"'));
  ok('quedó la fecha de hoy',            wb.bkDaysSince(JSON.parse(wb.localStorage.getItem('daily.backup')).lastExport) === 0);
} catch (e) { ok('banner en Hoy', false, e.message); }

try {
  const ws = bootBk(null, V2D, JSON.stringify({ firstSeen:hace(60), lastExport:hace(9) }));
  ws.ev('ui').tab = 'hoy'; ws.render();
  ws.document.querySelector('[data-act="bk-snooze"]').click();
  ok('posponer oculta el aviso',        ws.bkShouldWarn() === false);
  ok('posponer guarda hasta cuándo',    !!JSON.parse(ws.localStorage.getItem('daily.backup')).snoozeUntil);
  ok('el aviso vuelve en 7 días',       JSON.parse(ws.localStorage.getItem('daily.backup')).snoozeUntil === iso(new Date(d.getTime() + 7*86400000)));
  ok('el banner ya no se dibuja',       !ws.document.getElementById('app').innerHTML.includes('data-act="bk-snooze"'));
} catch (e) { ok('posponer', false, e.message); }

try {
  const wi2 = bootBk(null, null, JSON.stringify({ firstSeen:hace(60) }));
  wi2.importFromText(JSON.stringify({ app:'daily', format:2, exportedAt:hace(1), data:{ v:2, items:[], habits:[], habitLog:{}, gym:{} } }));
  wi2.document.querySelector('[data-act="confirm-yes"]').click();
  ok('importar registra la fecha del backup', wi2.bkDaysSince(JSON.parse(wi2.localStorage.getItem('daily.backup')).lastExport) === 1);
} catch (e) { ok('fecha tras importar', false, e.message); }

/* ---------- 29. pantalla de Ajustes ---------- */
console.log('\n29. Pantalla de Ajustes');
try {
  const wa = bootBk(V1_RAW, null);
  wa.ev('ui').tab = 'hoy'; wa.ev('ui').hoySub = null; wa.render();
  ok('Hoy tiene el engranaje', wa.document.querySelector('[data-act="ajustes-open"]') !== null);
  wa.document.querySelector('[data-act="ajustes-open"]').click();
  const h = wa.document.getElementById('app').innerHTML;
  ok('abre Ajustes',                wa.ev('ui').hoySub === 'ajustes' && h.includes('Ajustes'));
  ok('ofrece exportar e importar',  h.includes('data-act="bk-export"') && h.includes('data-act="bk-import"'));
  ok('dice el nombre del archivo',  h.includes('daily-backup.json'));
  ok('dice cuándo fue el último',   h.includes('Último backup'));
  ok('Ajustes no ocupa una pestaña', (h.match(/data-act="tab"/g) || []).length === 5 && !h.includes('data-tab="ajustes"'));
  wa.document.querySelector('[data-act="ajustes-back"]').click();
  ok('atrás vuelve a Hoy', wa.ev('ui').hoySub === null && wa.document.getElementById('app').innerHTML.includes('Sin fecha'));
} catch (e) { ok('pantalla de ajustes', false, e.message); }

/* ---------- 30. regresión final ---------- */
console.log('\n30. Regresión tras la etapa 4');
try {
  const wf = bootBk(V1_RAW, null);
  for (const [tab, marca] of [['hoy','Sin fecha'],['calendario','Citas'],['gym','Plan semanal'],['habitos','Hábitos'],['progreso','Resumen']]) {
    wf.ev('ui').tab = tab; wf.ev('ui').hoySub = null; wf.render();
    ok('la pestaña "' + tab + '" sigue andando', wf.document.getElementById('app').innerHTML.includes(marca));
  }
  wf.ev('ui').tab = 'gym'; wf.ev('ui').gymSub = 'rutinas'; wf.render();
  ok('Rutinas sigue abriendo', wf.document.getElementById('app').innerHTML.includes('Mis rutinas'));
  wf.ev('ui').gymSub = null;
  ok('la agenda sigue derivando bien', wf.tareasDe(TODAY).length === 2 && wf.agendaDe(TODAY).length === 3);
  wf.ev('ui').tab = 'calendario'; wf.ev('ui').calSel = TODAY; wf.render();
  wf.document.querySelector('[data-act="event-open"]').click();
  wf.document.querySelector('[data-act="item-delete"]').click();
  ok('confirmDelete sigue pidiendo confirmación', wf.document.querySelector('[data-act="confirm-yes"]') !== null);
  ok('su botón sigue diciendo Eliminar',          wf.document.querySelector('[data-act="confirm-yes"]').textContent.trim() === 'Eliminar');
  wf.document.querySelector('[data-act="confirm-yes"]').click();
  ok('y sigue borrando', wf.itemById('r1') === undefined);
} catch (e) { ok('regresión etapa 4', false, e.message); }

/* ---------- 31. pendiente completada desaparece al día siguiente ---------- */
console.log('\n31. Pendientes completadas');
try {
  const w = boot(null, null);
  const s = w.ev('state');
  s.items = [
    { id:'p1', kind:'tarea', title:'Pend activa', desc:'', date:null, time:null, done:false },
    { id:'p2', kind:'tarea', title:'Pend hecha hoy', desc:'', date:null, time:null, done:true, doneAt:TODAY },
    { id:'p3', kind:'tarea', title:'Pend hecha ayer', desc:'', date:null, time:null, done:true, doneAt:ago(1) },
    { id:'p4', kind:'tarea', title:'Pend hecha sin fecha', desc:'', date:null, time:null, done:true },
  ];
  w.save();
  ok('pendientes() sigue devolviendo todas', w.pendientes().length === 4);
  // pendVisible se evalúa contra el día que se está mirando.
  ok('activa: se ve cualquier día',            w.pendVisible(w.itemById('p1'), TODAY) === true && w.pendVisible(w.itemById('p1'), ago(1)) === true);
  ok('completada hoy: se ve mirando hoy',      w.pendVisible(w.itemById('p2'), TODAY) === true);
  ok('completada hoy: NO se ve mirando otro día', w.pendVisible(w.itemById('p2'), ago(1)) === false && w.pendVisible(w.itemById('p2'), ago(3)) === false);
  ok('completada ayer: no se ve mirando hoy',  w.pendVisible(w.itemById('p3'), TODAY) === false);
  ok('completada sin doneAt: nunca se ve',     w.pendVisible(w.itemById('p4'), TODAY) === false && w.pendVisible(w.itemById('p4'), ago(1)) === false);

  // en la vista de hoy: activa + la que se completó hoy; NO la de ayer
  w.ev('ui').tab = 'hoy'; w.ev('ui').hoySub = null; w.ev('ui').daySel = TODAY; w.render();
  let h = w.document.getElementById('app').innerHTML;
  ok('bandeja de hoy: muestra activa y la de hoy', h.includes('Pend activa') && h.includes('Pend hecha hoy'));
  ok('bandeja de hoy: oculta la de ayer',          !h.includes('Pend hecha ayer'));

  // al navegar la tira a otro día, la completada hoy YA NO aparece; la activa sí
  w.ev('ui').daySel = ago(2); w.render();
  h = w.document.getElementById('app').innerHTML;
  ok('otro día: la completada no aparece', !h.includes('Pend hecha hoy'));
  ok('otro día: la activa (backlog) sigue', h.includes('Pend activa'));

  // marcar una pendiente usa el día que se está mirando como doneAt
  w.ev('ui').daySel = TODAY; w.render();
  w.document.querySelector('[data-act="task-toggle"][data-id="p1"]').click();
  ok('marcar hoy: doneAt = hoy', w.itemById('p1').done === true && w.itemById('p1').doneAt === TODAY);
  w.document.querySelector('[data-act="task-toggle"][data-id="p1"]').click();
  ok('descompletar borra doneAt', w.itemById('p1').done === false && !('doneAt' in w.itemById('p1')));
  // marcar mientras se mira otro día: queda en ESE día
  w.ev('ui').daySel = ago(2); w.render();
  w.document.querySelector('[data-act="task-toggle"][data-id="p1"]').click();
  ok('marcar mirando otro día: doneAt = ese día', w.itemById('p1').doneAt === ago(2));
  ok('y se sigue viendo en ese día', w.document.getElementById('app').innerHTML.includes('Pend activa'));
  w.ev('ui').daySel = TODAY; w.render();
  ok('pero desde hoy ya no aparece', !w.document.getElementById('app').innerHTML.includes('Pend activa'));
} catch (e) { ok('pendientes completadas', false, e.message); }

/* ---------- 32. gráfico de línea interactivo ---------- */
console.log('\n32. Gráfico interactivo (lineChart)');
try {
  const w = boot(null, null);
  ok('lineChart existe', typeof w.ev('lineChart') === 'function');
  const svg = w.ev(`lineChart([{date:'${ago(4)}',v:60},{date:'${ago(2)}',v:62.5},{date:'${TODAY}',v:65}],'#FF6B6B',300,86,{unit:'kg'})`);
  ok('envuelve en .chartwrap con tooltip', svg.includes('class="chartwrap"') && svg.includes('class="charttip"'));
  ok('dibuja un punto tocable por registro', (svg.match(/data-act="chart-pt"/g) || []).length === 3);
  ok('cada punto lleva su etiqueta fecha+valor', svg.includes('62.5 kg') && svg.includes('data-lbl'));
  ok('dibuja el área con degradé', svg.includes('linearGradient') && svg.includes('url(#'));
  ok('serie vacía no rompe', w.ev(`lineChart([],'#fff',100,40)`).includes('chartwrap'));
  ok('un solo punto no rompe', w.ev(`lineChart([{date:'${TODAY}',v:70}],'#fff',100,40)`).includes('data-act="chart-pt"'));

  // el tooltip aparece al tocar un punto y se cierra al tocar otra vez
  const s = w.ev('state');
  s.gym.bodyWeights = [{ id:'b1', kg:72, date:ago(3) }, { id:'b2', kg:71, date:TODAY }];
  w.save(); w.ev('ui').tab = 'gym'; w.ev('ui').gymSub = null; w.render();
  const pt = w.document.querySelector('.chartwrap [data-act="chart-pt"]');
  ok('el peso corporal usa el gráfico interactivo', pt !== null);
  // Un <circle> SVG no tiene .click() en jsdom; en el navegador el click burbujea igual.
  const tap = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  tap(pt);
  const tip = w.document.querySelector('.chartwrap .charttip');
  ok('tocar un punto muestra el tooltip', tip.classList.contains('show') && /kg/.test(tip.textContent));
  tap(pt);
  ok('tocar de nuevo lo cierra', !tip.classList.contains('show'));
  // tocar fuera también lo cierra
  tap(pt);
  ok('reabre', w.document.querySelector('.charttip').classList.contains('show'));
  w.document.getElementById('app').click();
  ok('tocar fuera del gráfico cierra el tooltip', !w.document.querySelector('.charttip').classList.contains('show'));
} catch (e) { ok('lineChart', false, e.message); }

/* ---------- 33. detalle de ejercicio: registros por fecha + récord ---------- */
console.log('\n33. Detalle de ejercicio');
try {
  const w = boot(null, null);
  const s = w.ev('state');
  s.gym.lifts = [{ id:'LX', name:'Press banca', unit:'kg', color:'#4D96FF', history:[
    { date:ago(20), weight:40 }, { date:ago(10), weight:47.5 }, { date:ago(2), weight:45 } ] }];
  w.save();
  w.ev('ui').tab = 'gym'; w.ev('ui').gymSub = null; w.render();

  // tocar la tarjeta del ejercicio abre el detalle (no el form de cargar peso)
  w.document.querySelector('[data-act="lift-open"][data-id="LX"]').click();
  const ov = w.document.getElementById('overlay');
  const h = ov.innerHTML;
  ok('abre el detalle del ejercicio', ov.classList.contains('show') && h.includes('Press banca'));
  ok('lista los 3 registros por fecha', (h.match(/data-act="lift-rec-edit"/g) || []).length === 3);
  ok('muestra las fechas de cada registro', h.includes('kg') && h.includes(String(new Date(d.getTime()-20*86400000).getDate())));
  ok('marca el récord (47.5 fue el máximo)', h.includes('récord') && h.includes('47.5'));
  ok('tiene el gráfico interactivo', h.includes('data-act="chart-pt"'));
  ok('ofrece cargar peso y borrar ejercicio', h.includes('data-act="lift-log"') && h.includes('data-act="lift-delete"'));

  // editar un registro
  w.document.querySelectorAll('[data-act="lift-rec-edit"]')[0].click(); // el más reciente (ago 2, 45)
  ok('abre el form de editar registro', w.document.getElementById('overlay').innerHTML.includes('Editar registro'));
  const kg = w.document.querySelector('#lr-kg');
  kg.value = '50';
  w.document.querySelector('[data-act="modal-save"]').click();
  ok('editar cambia el peso del registro', w.ev('state').gym.lifts[0].history.some(r => r.weight === 50) && !w.ev('state').gym.lifts[0].history.some(r => r.weight === 45));
  ok('vuelve al detalle tras editar', w.document.getElementById('overlay').innerHTML.includes('Press banca'));

  // editar con peso inválido no guarda
  w.document.querySelectorAll('[data-act="lift-rec-edit"]')[0].click();
  w.document.querySelector('#lr-kg').value = '0';
  w.document.querySelector('[data-act="modal-save"]').click();
  ok('peso 0 no guarda y avisa', w.document.querySelectorAll('.ferr').length === 1 && !w.ev('state').gym.lifts[0].history.some(r => r.weight === 0));
  w.closeModal();

  // borrar un registro (quedan 3, se puede)
  w.document.querySelector('[data-act="lift-open"][data-id="LX"]').click();
  const antes = w.ev('state').gym.lifts[0].history.length;
  w.document.querySelectorAll('[data-act="lift-rec-delete"]')[0].click();
  w.document.querySelector('[data-act="confirm-yes"]').click();
  ok('borra un registro con confirmación', w.ev('state').gym.lifts[0].history.length === antes - 1);

  // no deja borrar el último registro
  const l = w.ev('state').gym.lifts[0];
  l.history = [{ date:TODAY, weight:60 }];
  w.save();
  w.document.querySelector('[data-act="lift-open"][data-id="LX"]').click();
  w.document.querySelector('[data-act="lift-rec-delete"]').click();
  ok('no deja borrar el único registro', w.document.getElementById('overlay').innerHTML.includes('único registro') || w.document.querySelector('[data-act="notice-ok"]') !== null);
  ok('el registro sigue ahí', w.ev('state').gym.lifts[0].history.length === 1);
} catch (e) { ok('detalle de ejercicio', false, e.message); }

/* ---------- 34. sigue sin romper el resto ---------- */
console.log('\n34. Regresión de los cambios 3.6');
try {
  const w = bootBk(V1_RAW, null);
  // export/import round-trip sigue exacto con el campo doneAt presente
  const s = w.ev('state');
  s.items[0].done = true; s.items[0].doneAt = TODAY;
  w.save();
  const json = JSON.stringify(w.backupPayload());
  const antes = JSON.stringify(w.ev('state'));
  s.items = [];
  w.save();
  w.importFromText(json);
  w.document.querySelector('[data-act="confirm-yes"]').click();
  ok('round-trip con doneAt vuelve exacto', JSON.stringify(w.ev('state')) === antes);
  ok('doneAt sobrevive al backup', w.ev('state').items.some(x => x.doneAt === TODAY));

  // el gym sigue entero
  w.ev('ui').tab = 'gym'; w.ev('ui').gymSub = null; w.render();
  const h = w.document.getElementById('app').innerHTML;
  ok('gym sigue con plan, cargas y peso', h.includes('Plan semanal') && h.includes('Cargas por ejercicio') && h.includes('Peso corporal'));
  ok('las tarjetas de ejercicio siguen ahí', h.includes('data-act="lift-open"'));
  ok('daily.v1 intacta', w.localStorage.getItem('daily.v1') === V1_RAW);
} catch (e) { ok('regresión 3.6', false, e.message); }

/* =================== v3 etapa 1: sesión =================== */
// El SDK real habla con Google, así que acá corre el simulado (ver fakeFirebase en el
// harness). Lo que se prueba es NUESTRA lógica: la puerta de acceso y las validaciones.
// El registro/login/verificación de verdad se prueban a mano contra el proyecto.
const flush = () => new Promise(r => setTimeout(r, 0));

(async () => {

/* ---------- 35. puerta de acceso (rutas protegidas) ---------- */
console.log('\n35. Puerta de acceso');
try {
  const w = bootAuth(null, null);

  // Firebase todavía no contestó: ni la app ni el login, pantalla de espera.
  ok('antes de saber si hay sesión, no se filtra la app', !w.html().includes('data-act="tab"'));
  ok('muestra la pantalla de espera',                     w.html().includes('Abriendo tu Daily'));

  // Sin sesión → login, y nada de la app.
  w.fb.signal(null);
  ok('sin sesión cae en login',        w.html().includes('data-act="auth-login"'));
  ok('login no dibuja las pestañas',   !w.html().includes('data-act="tab"'));
  ok('login no dibuja el botón +',     !w.html().includes('data-act="quick-add"'));
  ok('ofrece recuperar contraseña',    w.html().includes('data-s="reset"'));

  // Navegación entre los tres formularios sin sesión.
  w.tap('[data-s="registro"]');
  ok('va a registro',                  w.ev('AUTH').screen === 'registro' && w.html().includes('data-act="auth-registro"'));
  ok('registro pide confirmación',     w.html().includes('id="au-pass2"'));
  w.tap('[data-s="login"]');
  ok('vuelve a login',                 w.ev('AUTH').screen === 'login');
  w.tap('[data-s="reset"]');
  ok('va a recuperar contraseña',      w.html().includes('data-act="auth-reset"'));

  // Con sesión pero sin verificar → pantalla bloqueante.
  w.fb.signal(w.fb.fakeUser('lulo@ejemplo.com', false));
  ok('sin verificar muestra la traba',      w.html().includes('Verificá tu email'));
  ok('la traba dice el email',              w.html().includes('lulo@ejemplo.com'));
  ok('sin verificar tampoco entra la app',  !w.html().includes('data-act="tab"'));
  ok('ofrece reenviar el email',            w.html().includes('data-act="auth-resend"'));
  ok('ofrece cerrar sesión',                w.html().includes('data-act="auth-logout"'));

  // Con sesión y verificado → la app entera.
  w.fb.signal(w.fb.fakeUser('lulo@ejemplo.com', true));
  ok('verificado entra a la app',      (w.html().match(/data-act="tab"/g) || []).length === 5);
  ok('arranca en Hoy',                 w.ev('ui').tab === 'hoy');
  ok('ya no hay formularios de sesión', !w.html().includes('data-act="auth-login"'));

  // Y si se cierra la sesión, se vuelve a la puerta.
  w.fb.signal(null);
  ok('al cerrar sesión vuelve al login', w.html().includes('data-act="auth-login"'));
} catch (e) { ok('puerta de acceso', false, e.message); }

/* ---------- 36. sin SDK ---------- */
console.log('\n36. Sin SDK cargado');
try {
  const w = bootAuth(null, { noSdk: true });
  ok('avisa que no se pudo cargar', w.html().includes('No se pudo cargar'));
  ok('no deja entrar a la app',     !w.html().includes('data-act="tab"'));
} catch (e) { ok('sin SDK', false, e.message); }

/* ---------- 37. validaciones de los formularios ---------- */
console.log('\n37. Validaciones de los formularios');
try {
  const w = bootAuth(null, null);
  w.fb.signal(null);

  // Login vacío: marca los dos campos y no llama a Firebase.
  w.tap('[data-act="auth-login"]');
  ok('login vacío no llama a Firebase', w.fb.called('signIn').length === 0);
  ok('login vacío marca los campos',    w.document.querySelectorAll('#au-email.bad, #au-pass.bad').length === 2);
  ok('login vacío explica qué falta',   w.html().includes('Poné tu email.'));

  // Email con formato inválido.
  w.set('#au-email', 'esto-no-es-un-email'); w.set('#au-pass', 'secreta1');
  w.tap('[data-act="auth-login"]');
  ok('email inválido no llama a Firebase', w.fb.called('signIn').length === 0);
  ok('email inválido lo dice',             w.html().includes('formato válido'));

  // Válido: recién ahí sale el pedido, con lo tipeado.
  w.set('#au-email', 'lulo@ejemplo.com');
  w.tap('[data-act="auth-login"]');
  const si = w.fb.called('signIn');
  ok('login válido llama a Firebase',   si.length === 1);
  ok('login válido manda email y pass', si[0] && si[0].args[0] === 'lulo@ejemplo.com' && si[0].args[1] === 'secreta1');
  ok('mientras espera, bloquea el botón', w.html().includes('abtn primary busy') || w.ev('AUTH').busy === true);

  // Registro: contraseña corta y confirmación que no coincide.
  const r = bootAuth(null, null);
  r.fb.signal(null);
  r.tap('[data-s="registro"]');
  r.set('#au-email', 'lulo@ejemplo.com'); r.set('#au-pass', '123'); r.set('#au-pass2', '123');
  r.tap('[data-act="auth-registro"]');
  ok('contraseña corta no crea la cuenta', r.fb.called('createUser').length === 0);
  ok('contraseña corta lo explica',        r.html().includes('al menos 6 caracteres'));

  r.set('#au-pass', 'secreta1'); r.set('#au-pass2', 'secreta2');
  r.tap('[data-act="auth-registro"]');
  ok('contraseñas distintas no crean cuenta', r.fb.called('createUser').length === 0);
  ok('contraseñas distintas lo explican',     r.html().includes('no coinciden'));

  // Registro válido: crea la cuenta y dispara solo el mail de verificación.
  r.set('#au-pass2', 'secreta1');
  r.tap('[data-act="auth-registro"]');
  await flush();
  const cu = r.fb.called('createUser');
  ok('registro válido crea la cuenta',        cu.length === 1 && cu[0].args[0] === 'lulo@ejemplo.com');
  ok('registro dispara el mail de verificación', r.fb.called('sendEmailVerification').length === 1);

  // Recuperar contraseña.
  const p = bootAuth(null, null);
  p.fb.signal(null);
  p.tap('[data-s="reset"]');
  p.set('#au-email', 'no-va');
  p.tap('[data-act="auth-reset"]');
  ok('reset con email inválido no manda nada', p.fb.called('sendPasswordResetEmail').length === 0);
  p.set('#au-email', 'lulo@ejemplo.com');
  p.tap('[data-act="auth-reset"]');
  await flush();
  const pr = p.fb.called('sendPasswordResetEmail');
  ok('reset válido pide el email',   pr.length === 1 && pr[0].args[0] === 'lulo@ejemplo.com');
  ok('reset avisa que salió el mail', p.html().includes('link para cambiar la contraseña'));
} catch (e) { ok('validaciones', false, e.message); }

/* ---------- 38. errores de Firebase ---------- */
console.log('\n38. Errores de Firebase');
try {
  const w = bootAuth(null, { failCode: 'auth/invalid-credential' });
  w.fb.signal(null);
  w.set('#au-email', 'lulo@ejemplo.com'); w.set('#au-pass', 'secreta1');
  w.tap('[data-act="auth-login"]');
  await flush();
  ok('traduce el error de Firebase', w.html().includes('El email o la contraseña no son correctos'));
  ok('no se pierde lo tipeado',      w.document.querySelector('#au-email').value === 'lulo@ejemplo.com');
  ok('el botón se destraba',         w.ev('AUTH').busy === false);

  const n = bootAuth(null, { failCode: 'auth/network-request-failed' });
  n.fb.signal(null);
  n.set('#au-email', 'lulo@ejemplo.com'); n.set('#au-pass', 'secreta1');
  n.tap('[data-act="auth-login"]');
  await flush();
  ok('el error de red se explica', n.html().includes('No hay conexión'));
} catch (e) { ok('errores de Firebase', false, e.message); }

/* ---------- 39. cerrar sesión desde Ajustes ---------- */
console.log('\n39. Cerrar sesión desde Ajustes');
try {
  const w = bootAuth(null, null);
  w.fb.signal(w.fb.fakeUser('lulo@ejemplo.com', true));
  w.tap('[data-act="ajustes-open"]');
  ok('Ajustes muestra la cuenta',        w.html().includes('Sesión iniciada como') && w.html().includes('lulo@ejemplo.com'));
  ok('Ajustes ofrece cerrar sesión',     w.html().includes('data-act="auth-logout"'));

  w.tap('[data-act="auth-logout"]');
  ok('cerrar sesión pide confirmación',  w.document.querySelector('[data-act="confirm-yes"]') !== null);
  ok('sin confirmar no cierra nada',     w.fb.called('signOut').length === 0);
  w.tap('[data-act="confirm-yes"]');
  await flush();
  ok('al confirmar cierra la sesión',    w.fb.called('signOut').length === 1);

  w.fb.signal(null);
  ok('y vuelve al login',                w.html().includes('data-act="auth-login"'));
  ok('vuelve a Hoy, no a Ajustes',       w.ev('ui').hoySub === null);
} catch (e) { ok('cerrar sesión', false, e.message); }

/* ---------- 40. los datos no se tocaron (siguen locales) ---------- */
console.log('\n40. Los datos siguen siendo locales');
try {
  const w = bootAuth(null, null);
  w.fb.signal(w.fb.fakeUser('lulo@ejemplo.com', true));
  ok('la app sigue escribiendo en daily.v2', (w.ev('commit()'), w.localStorage.getItem('daily.v2') !== null));
  const antes = w.localStorage.getItem('daily.v2');
  w.fb.signal(null);
  ok('cerrar sesión no borra los datos',     w.localStorage.getItem('daily.v2') === antes);
  w.fb.signal(w.fb.fakeUser('otro@ejemplo.com', true));
  ok('los datos siguen ahí con otra cuenta', w.localStorage.getItem('daily.v2') === antes);
} catch (e) { ok('datos locales', false, e.message); }


/* ---------- 41. datos desde Firestore (hidratacion + gate + migracion) ---------- */
console.log('\n41. Datos desde Firestore');
try {
  // (a) documento existente en la nube -> hidrata el state
  const cloud = { v:2, items:[{ id:'X1', kind:'tarea', title:'Tarea en la nube', date:TODAY, time:null, done:false }], habits:[], habitLog:{}, gym:{} };
  const w = bootFs({ docs: { 'uid_lulo@x.com': cloud } });
  const u = w.fb.fakeUser('lulo@x.com', true);
  w.fb.signal(u);
  ok('con doc existente entra a la app',   (w.html().match(/data-act="tab"/g) || []).length === 5);
  ok('hidrata el state desde la nube',     w.ev('state') && w.ev('state').items.some(x => x.id === 'X1'));
  ok('la tarea de la nube se ve en Hoy',   w.html().includes('Tarea en la nube'));
  ok('DATA quedo listo con el uid',        w.ev('DATA').ready === true && w.ev('DATA').uid === u.uid);

  // (b) usuario nuevo sin doc -> arranca 100% vacío + crea el doc, y ve la bienvenida
  const w2 = bootFs({});
  const u2 = w2.fb.fakeUser('nuevo@x.com', true);
  w2.fb.signal(u2);
  ok('usuario nuevo ve la bienvenida',     w2.html().includes('Bienvenido a Daily') && !w2.html().includes('data-act="tab"'));
  ok('se creo el doc en la nube',          w2.fb.setsOf(u2.uid).length >= 1 && w2.fb.docOf(u2.uid) != null);
  const st2 = w2.ev('state');
  ok('la cuenta nueva arranca vacía',      st2.items.length === 0 && st2.habits.length === 0 &&
       st2.gym.lifts.length === 0 && st2.gym.customTypes.length === 0 && st2.gym.routines.length === 0 &&
       st2.gym.bodyWeights.length === 0 && Object.keys(st2.habitLog).length === 0);
  w2.tap('[data-act="onb-skip"]');
  ok('saltear la bienvenida entra a la app', (w2.html().match(/data-act="tab"/g) || []).length === 5);

  // (c) migracion desde daily.v2 local: el doc nuevo se siembra con lo local
  const localV2 = JSON.stringify({ v:2, items:[{ id:'L1', kind:'tarea', title:'Tarea local', date:TODAY, time:null, done:false }], habits:[], habitLog:{}, gym:{} });
  const w3 = bootFs({ seedV2: localV2 });
  const u3 = w3.fb.fakeUser('mig@x.com', true);
  w3.fb.signal(u3);
  ok('migra el daily.v2 local a la nube',  w3.fb.docOf(u3.uid) && w3.fb.docOf(u3.uid).items.some(x => x.id === 'L1'));
  ok('y lo muestra en la app',             w3.html().includes('Tarea local'));

  // (d) gate de carga: hasta el primer snapshot, pantalla de carga y nada de la app
  const w4 = bootFs({ deferSnapshot:true, docs: { 'uid_wait@x.com': cloud } });
  const u4 = w4.fb.fakeUser('wait@x.com', true);
  w4.fb.signal(u4);
  ok('mientras cargan los datos no se filtra la app', !w4.html().includes('data-act="tab"'));
  ok('muestra la pantalla de carga',       w4.html().includes('Abriendo tu Daily') && w4.ev('DATA').ready === false);
  w4.fb.emit(u4.uid);
  ok('llegado el snapshot entra la app',   (w4.html().match(/data-act="tab"/g) || []).length === 5);
} catch (e) { ok('datos desde Firestore', false, e.message); }

/* ---------- 42. guardar va a Firestore, no a localStorage ---------- */
console.log('\n42. Guardar va a Firestore');
try {
  const w = bootFs({});
  const u = w.fb.fakeUser('save@x.com', true);
  w.fb.signal(u);
  const before = w.fb.setsOf(u.uid).length;
  w.ev('commit()');                                  // una accion de la app
  ok('commit escribe en Firestore',        w.fb.setsOf(u.uid).length > before);
  ok('no escribe daily.v2 en localStorage', w.localStorage.getItem('daily.v2') === null);
  ok('no escribe daily.v1',                w.localStorage.getItem('daily.v1') === null);
} catch (e) { ok('guardar a Firestore', false, e.message); }

/* ---------- 43. importar backup escribe a Firestore ---------- */
console.log('\n43. Importar escribe a Firestore');
try {
  const w = bootFs({});
  const u = w.fb.fakeUser('imp@x.com', true);
  w.fb.signal(u);
  const payload = JSON.stringify({ app:'daily', format:2, exportedAt:'2026-01-01T00:00:00.000Z',
    data:{ v:2, items:[{ id:'IMP', kind:'tarea', title:'Tarea importada', date:TODAY, time:null, done:false }], habits:[], habitLog:{}, gym:{} } });
  w.ev('importFromText(' + JSON.stringify(payload) + ')');
  w.tap('[data-act="confirm-yes"]');
  ok('import reemplaza el state',          w.ev('state').items.some(x => x.id === 'IMP'));
  ok('import escribe a Firestore',         w.fb.docOf(u.uid) && (w.fb.docOf(u.uid).items || []).some(x => x.id === 'IMP'));
  ok('import no escribe localStorage',     w.localStorage.getItem('daily.v2') === null);
} catch (e) { ok('import a Firestore', false, e.message); }

/* ---------- 44. cerrar sesion corta el sync ---------- */
console.log('\n44. Cerrar sesion corta el sync');
try {
  const w = bootFs({ docs: { 'uid_out@x.com': { v:2, items:[], habits:[], habitLog:{}, gym:{} } } });
  const u = w.fb.fakeUser('out@x.com', true);
  w.fb.signal(u);
  ok('con sesion, DATA activo',            w.ev('DATA').uid === u.uid && w.ev('state') !== null);
  w.fb.signal(null);
  ok('logout corta el sync',               w.ev('DATA').uid === null && w.ev('DATA').ready === false);
  ok('logout vacia el state',              w.ev('state') === null);
  ok('logout vuelve al login',             w.html().includes('data-act="auth-login"'));
} catch (e) { ok('logout corta sync', false, e.message); }

/* ---------- 45. daily.v1 / daily.v2 intactos (solo lectura) ---------- */
console.log('\n45. Legado intacto');
try {
  const localV2 = JSON.stringify({ v:2, items:[], habits:[], habitLog:{}, gym:{} });
  const w = bootFs({ seedV2: localV2 });
  w.localStorage.setItem('daily.v1', V1_RAW);
  const v1before = w.localStorage.getItem('daily.v1'), v2before = w.localStorage.getItem('daily.v2');
  const u = w.fb.fakeUser('leg@x.com', true);
  w.fb.signal(u);
  w.ev('commit()'); w.ev('commit()');
  ok('daily.v1 sigue intacto',             w.localStorage.getItem('daily.v1') === v1before);
  ok('daily.v2 local no se modifica',      w.localStorage.getItem('daily.v2') === v2before);
} catch (e) { ok('legado intacto', false, e.message); }

/* ---------- 46. onboarding: estado en Firestore (bienvenida + tips) ---------- */
console.log('\n46. Onboarding persistido en Firestore');
try {
  // Cuenta nueva: ve la bienvenida; terminarla marca welcomeSeen en el doc de la nube.
  const w = bootFs({});
  const u = w.fb.fakeUser('onb@x.com', true);
  w.fb.signal(u);
  ok('la cuenta nueva ve la bienvenida',   w.html().includes('Bienvenido a Daily'));
  ok('avanza entre slides',               (w.tap('[data-act="onb-next"]'), w.html().includes('Cinco secciones')));
  w.tap('[data-act="onb-next"]');          // hasta el último slide (el botón +)
  ok('el último slide ofrece Empezar',     w.html().includes('data-act="onb-finish"'));
  w.tap('[data-act="onb-finish"]');
  ok('terminar guarda welcomeSeen en la nube', w.fb.docOf(u.uid).onboarding.welcomeSeen === true);
  ok('y ya entra a la app',                (w.html().match(/data-act="tab"/g) || []).length === 5);

  // Primera visita a una pestaña: sale el tip; "Entendido" lo marca visto en la nube.
  ok('primera vez en Hoy muestra el tip',  w.html().includes('onbtip-card'));
  w.tap('[data-act="onb-tip-ok"]');
  ok('tip visto se guarda en la nube',     w.fb.docOf(u.uid).onboarding.tips.hoy === true);
  ok('el tip ya no reaparece en Hoy',      !w.html().includes('onbtip-card'));

  // Persistencia entre dispositivos: con el doc ya marcado, NO se vuelve a mostrar.
  const w2 = bootFs({ docs: { [u.uid]: w.fb.docOf(u.uid) } });
  w2.fb.signal(w2.fb.fakeUser('onb@x.com', true));
  ok('otro dispositivo no repite la bienvenida', !w2.html().includes('Bienvenido a Daily') &&
       (w2.html().match(/data-act="tab"/g) || []).length === 5);
  ok('ni repite el tip ya visto',          !w2.html().includes('onbtip-card'));

  // "Ver el tutorial de nuevo" (Ajustes) reinicia la bienvenida.
  w2.ev("onbAction('onb-reset')");
  ok('reset vuelve a mostrar la bienvenida', w2.html().includes('Bienvenido a Daily'));
  ok('reset se persiste en la nube',       w2.fb.docOf('uid_onb@x.com').onboarding.welcomeSeen === false);
} catch (e) { ok('onboarding persistido', false, e.message); }

})().then(done, e => { ok('tests de sesión', false, e.message); done(); });
