/* Las filas de la app son <div> que se tocan, no <button>: casi todas tienen adentro otro
   control (el check de una tarea, el "poner fecha" de una pendiente), y un <button> dentro
   de otro <button> es HTML inválido.

   Este helper les devuelve lo mínimo para que igual se comporten como botones: el teclado
   las alcanza con Tab, Enter y Espacio las activan, y un lector de pantalla las anuncia
   como algo tocable. La app vanilla no tenía nada de esto — las filas solo respondían al
   mouse y al dedo.

     <div className="trow" {...clickable(() => abrir(t))}>

   Donde no haya nada anidado adentro, mejor un <button> de verdad que esto. */
export function clickable(onClick, { label } = {}) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick,
    onKeyDown: (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // Espacio scrollea la página si no se lo frena; Enter podría enviar un formulario.
      e.preventDefault();
      onClick(e);
    },
  };
}
