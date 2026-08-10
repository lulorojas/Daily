import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/* ----------------------------- CONFIRMACIÓN -----------------------------
   El cartelito de "¿Cerrar sesión?". Mismas clases y mismos textos que confirmAction()
   de la app vanilla, incluido el Enter para confirmar y el Escape para cancelar.

   createPortal dibuja este componente en <body> en vez de donde está escrito en el árbol.
   Es la forma sana de hacer modales: el JSX vive al lado del botón que lo abre (fácil de
   leer), pero el nodo termina afuera de todo, sin que un overflow o un z-index del padre
   se lo coma. */
export function ConfirmDialog({ title, description, okLabel, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onConfirm, onCancel]);

  return createPortal(
    // Tocar el fondo cancela; los clics de adentro no llegan hasta acá.
    <div className="confirm-layer" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="confirm" role="alertdialog" aria-modal="true" aria-label={title}>
          <div className="ct">{title}</div>
          <div className="cd">{description}</div>
          <div className="row">
            <button className="b cancel" onClick={onCancel}>Cancelar</button>
            <button className="b danger" onClick={onConfirm}>{okLabel}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
