import { HabitIcon, FlameIcon, PlusIcon } from '../ui/Icons';
import { tint } from '../../lib/theme';

/* ----------------------------- UN EXTRA, CON SU FRECUENCIA -----------------------------
   Mismo dibujo que la fila de un hábito en Hoy (iconwrap + nombre + meta), reusando las
   mismas clases: un extra de comidas se mira igual que un hábito, lo que cambia es de
   dónde sale el número. Se marca solo cuando lo mencionás en la bitácora, o con el "+"
   de la derecha (pedido explícito: registrar "de una manera fácil") — que lo anota en la
   bitácora del día que se está mirando. */
const QUALITY_LABEL = { malo: 'evitar', bueno: 'está bien' };

export function MealExtraRow({ extra, semana, racha, onAdd }) {
  const meta = racha > 0
    ? `${semana} esta semana · racha de ${racha} ${racha === 1 ? 'día' : 'días'}`
    : `${semana} esta semana`;

  return (
    <div className="habrow">
      <div className="iconwrap habicon" style={{ background: tint(extra.color, '24') }}>
        <HabitIcon icon={extra.icon} color={extra.color} />
      </div>

      <div className="grow">
        <div className="habname">
          {extra.name}
          {QUALITY_LABEL[extra.quality] && <span className={`mealextra-q ${extra.quality}`}>{QUALITY_LABEL[extra.quality]}</span>}
        </div>
        <div className="habmeta">
          {racha > 0 && <FlameIcon color={extra.color} />}
          <span>{meta}</span>
        </div>
      </div>

      {onAdd && (
        <button type="button" className="roundadd" style={{ background: tint(extra.color, '2E') }} onClick={onAdd} aria-label={`Anotar ${extra.name}`}>
          <PlusIcon size={18} strokeWidth="2.6" color={extra.color} />
        </button>
      )}
    </div>
  );
}
