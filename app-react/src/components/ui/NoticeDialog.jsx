import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/* Port de notice() (utils.js): el aviso de un solo botón, para cuando algo salió mal y no
   hay nada que confirmar ("no se pudo exportar", "el archivo no es válido"). Hermano de
   ConfirmDialog, que sí tiene dos botones — comparten las mismas clases (.confirm/.ct/.cd/
   .row/.b), la única diferencia real es cuántos botones hay y qué hace Enter. */
export function NoticeDialog({ title, description, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="confirm-layer" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="confirm" role="alertdialog" aria-modal="true" aria-label={title}>
          <div className="ct">{title}</div>
          <div className="cd">{description}</div>
          <div className="row">
            <button className="b teal" onClick={onClose}>Entendido</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
