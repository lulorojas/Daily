import { optionLabel } from '../../lib/meals';

/* ----------------------------- EL PLAN, DE SOLO LECTURA -----------------------------
   Lo que tenés que comer, para mirar de reojo mientras anotás. Se edita en otro lado
   (MealPlanManager, desde el botón de la cabecera de la sección): esta tarjeta no toca
   nada, igual que TrainingRow en Hoy no edita el plan de Gimnasio.

   `optionLabel()` resuelve el texto a mostrar sea cual sea el modo de la opción — texto
   libre o ítems con cantidad (ver MealOptionFormModal.jsx) —, así esta tarjeta no tiene
   que saber nada de esa diferencia. */
export function MealPlanCard({ slots }) {
  return (
    <div className="card pad">
      {slots.map((s) => (
        <div className="mealslot" key={s.id}>
          <div className="mealslot-name">{s.name}</div>
          {s.options.length === 0 ? (
            <div className="mealslot-vacio">Sin opciones todavía</div>
          ) : (
            <div className="chips">
              {s.options.map((o) => (
                <span className="chip mealslot-opt" key={o.id}>{optionLabel(o)}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
