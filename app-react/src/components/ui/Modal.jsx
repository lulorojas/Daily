import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { C } from '../../lib/theme';

/* ----------------------------- LA HOJA (MODAL) -----------------------------
   El contenedor de todos los formularios y menús: la hoja que sube desde abajo en el
   teléfono y aparece centrada en la compu (eso último lo resuelve el CSS solo).

   Mismo marcado que openModal() en vanilla: .overlay > .scrim + .sheet(.mhead + .mbody).
   Tres diferencias, todas a favor:

   1. Es un COMPONENTE, no un innerHTML. En vanilla, abrir un modal era pisar el HTML de
      un div global y después enganchar listeners a mano con onOverlay(), acordándose de
      limpiarlos con clearModalHandlers() para que el modal siguiente no heredara los del
      anterior. Ese bucle de "acordarse de limpiar" acá no existe: si el componente no se
      dibuja, sus handlers se van con él.

   2. Cuando hay algo para guardar, la hoja ES un <form> y el botón Guardar es su submit.
      Eso da gratis la semántica correcta y el foco por teclado. (El Enter igual se maneja
      abajo a mano, para que funcione también cuando el foco no está en ningún campo,
      que es lo que hacía el listener global de la app vanilla.)

   3. createPortal la saca del árbol donde está escrita y la cuelga de <body>. El JSX vive
      al lado de quien la abre — se lee de corrido — pero el nodo termina afuera de todo,
      donde ningún overflow ni z-index del padre se lo puede comer.

   OJO con los colores acá adentro: la hoja vive FUERA de #app, que es donde está definida
   la variable --accent. Adentro del modal el acento se pasa siempre explícito, igual que
   hacía vanilla, o se leería el ámbar de :root. */
export function Modal({ title, accent = C.amber, saveLabel = 'Guardar', onSave, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      /* Si hay una confirmación abierta encima ("¿Eliminar esta tarea?"), las teclas son
         de ella, no de la hoja. Es la misma guarda que hacía app.js mirando .notice-layer:
         sin esto, un Enter confirmaría el borrado Y guardaría el formulario. */
      if (document.querySelector('.confirm-layer')) return;

      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }

      if (!onSave) return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      const t = e.target;
      // En una descripción multilínea, Enter es un salto de línea, no "guardar".
      if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      // Con el foco en un <input>, el <form> ya se envía solo: meterse acá guardaría dos veces.
      if (t && t.tagName === 'INPUT') return;
      e.preventDefault();
      onSave();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSave, onClose]);

  const Sheet = onSave ? 'form' : 'div';
  const sheetProps = onSave
    ? { onSubmit: (e) => { e.preventDefault(); onSave(); }, noValidate: true }
    : {};

  return createPortal(
    <div className="overlay show">
      <div className="scrim" onClick={onClose} />
      <Sheet className="sheet" role="dialog" aria-modal="true" aria-label={title} {...sheetProps}>
        <div className="mhead">
          <div className="grab" />
          <div className="mhrow">
            <button type="button" className="cancel" onClick={onClose}>Cancelar</button>
            <span className="title">{title}</span>
            {onSave
              ? <button type="submit" className="save" style={{ color: accent }}>{saveLabel}</button>
              /* Sin botón de guardar, igual va un hueco del mismo ancho: si no, el título
                 dejaría de estar centrado. Vanilla ponía un <span style="width:56px">. */
              : <span className="mhrow-gap" />}
          </div>
        </div>
        <div className="mbody">{children}</div>
      </Sheet>
    </div>,
    document.body,
  );
}
