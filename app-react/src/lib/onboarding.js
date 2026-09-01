/* ----------------------------- ONBOARDING: datos del tour -----------------------------
   Port de la constante TOUR de app/js/onboarding.js, palabra por palabra. Es el único
   dato que hacía falta portar: la navegación paso a paso es estado de React (ver
   context/OnboardingProvider.jsx), no algo que viva en esta lista.

   kind:'info'    -> tarjeta centrada sobre fondo atenuado (qué es / instalar / + / cierre).
   kind:'section' -> el tour salta a esa sección y muestra un tip abajo, sobre la pantalla real. */
export const TOUR = [
  {
    kind: 'info',
    key: 'que-es',
    mark: 'D',
    title: 'Bienvenido a Daily',
    body: 'Es una web app instalable: tus datos viven en tu cuenta (la nube), pero también funciona sin internet y sincroniza sola al reconectar.',
  },
  {
    kind: 'info',
    key: 'instalar',
    install: true,
    title: 'Instalá Daily',
    body: 'Agregala a tu pantalla de inicio y ábrela como una app más.',
  },
  { kind: 'section', tab: 'hoy', title: 'Hoy', tip: 'Tu día completo: tareas, citas y hábitos. Movete entre los días con los círculos de arriba.' },
  { kind: 'section', tab: 'calendario', title: 'Calendario', tip: 'Todo lo que tiene fecha, mes a mes. Tocá cualquier día para ver o agregar algo.' },
  { kind: 'section', tab: 'gym', title: 'Gimnasio', tip: 'Tu plan, tus cargas y tu peso. En "Mis rutinas" armás tu biblioteca de entrenamientos.' },
  { kind: 'section', tab: 'habitos', title: 'Hábitos', tip: 'Marcá tu hábito cada día y sostené la racha.' },
  { kind: 'section', tab: 'progreso', title: 'Progreso', tip: 'Tu evolución en gráficos. Cambiá el período de arriba (Semana / Mes / Año / Todo).' },
  {
    kind: 'info',
    key: 'mas-uso',
    mark: '+',
    title: 'El botón +',
    body: 'Con el + de la barra cargás lo que sea (tarea, cita, hábito o tu peso). Toma el color de la sección en la que estás.',
  },
  {
    kind: 'info',
    key: 'cierre',
    check: true,
    title: '¡Listo!',
    body: 'Eso es todo. Podés volver a ver este tutorial cuando quieras desde Ajustes.',
  },
];
