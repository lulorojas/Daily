import { useState } from 'react';
import { PlusIcon } from '../ui/Icons';

/* ----------------------------- ESCRIBIR EN LA BITÁCORA -----------------------------
   La caja de texto donde se anota qué comiste. Sin precedente en la app: es lo más
   parecido a un chat que tiene Daily, aunque del otro lado no contesta nadie — el "bot"
   solo reconoce y registra en silencio (ver matchEntry en lib/meals.js).

   Enter envía y Shift+Enter hace un salto de línea, que es lo que espera cualquiera que
   haya usado un chat. Es un <form> de verdad para que en el teléfono el teclado muestre
   "Enviar" en vez de "Intro". */
export function MealLogComposer({ onSend }) {
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form className="mealcomposer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <textarea
        className="inp mealinp"
        rows={1}
        placeholder="¿Qué comiste?"
        aria-label="Qué comiste"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
      />
      <button type="submit" className="mealsend" aria-label="Anotar">
        <PlusIcon size={18} strokeWidth="2.6" color="#0A0C11" />
      </button>
    </form>
  );
}
