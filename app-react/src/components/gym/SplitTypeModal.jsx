import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { useData } from '../../hooks/useData';
import { splitCustomType } from '../../store/mutations';
import { daysUsingMuscle, suggestSplit } from '../../lib/gym';
import { C } from '../../lib/theme';

/* ----------------------------- DIVIDIR UN MÚSCULO COMBINADO -----------------------------
   Para los tipos que vienen de cuando un turno tenía UNO solo: "Pecho y bícep" se parte en
   "Pecho" y "Bícep", y TODOS los días ya cargados que lo usaban pasan a tener los dos.

   El campo viene lleno: suggestSplit() ya leyó el nombre y propuso la división (parte por
   "y", comas, barras, "+"), así que en el caso normal es confirmar, no escribir. Se edita
   igual, porque adivinar por el nombre no siempre acierta ("Pierna y glúteo" sí, "Full
   body" no).

   Lo que se avisa antes de confirmar es lo que no se puede deshacer con un botón: cuántos
   días del historial se van a reescribir. */
export function SplitTypeModal({ type, onClose, onSaved }) {
  const { data, update } = useData();
  const partesId = useId();
  const partesRef = useRef(null);

  const [texto, setTexto] = useState(() => suggestSplit(type.name).join(', '));
  const [error, setError] = useState(null);

  const partes = suggestSplit(texto);
  const dias = daysUsingMuscle(data, type.name);

  const handleSave = () => {
    if (!partes.length) {
      setError('Escribí en qué músculos se divide, separados por coma.');
      partesRef.current?.focus();
      return;
    }
    update((draft) => splitCustomType(draft, type.id, partes));
    onSaved?.();
  };

  return (
    <Modal title="Dividir músculo" accent={C.rose} saveLabel="Dividir" onSave={handleSave} onClose={onClose}>
      <Field label={`"${type.name}" se divide en`} hint="separados por coma" htmlFor={partesId} error={error}>
        <input
          id={partesId}
          ref={partesRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder="Ej: Pecho, Bícep"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); if (error) setError(null); }}
        />
      </Field>

      {partes.length > 0 && (
        <div className="chips">
          {partes.map((p) => <span className="chip splitchip" key={p}>{p}</span>)}
        </div>
      )}

      <div className="managetypes-note">
        {dias === 0
          ? `"${type.name}" no está marcado en ningún día: solo se cambia el catálogo.`
          : `Se van a reescribir ${dias} ${dias === 1 ? 'día' : 'días'} del plan: donde decía "${type.name}" van a quedar ${partes.length === 1 ? 'el músculo nuevo' : 'los músculos nuevos'}, y cada uno va a contar por su cuenta en Progreso.`}
      </div>
    </Modal>
  );
}
