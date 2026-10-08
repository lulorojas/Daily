import { HabitIcon, FlameIcon } from '../ui/Icons';
import { tint } from '../../lib/theme';

/* ----------------------------- UN EXTRA, CON SU FRECUENCIA -----------------------------
   Mismo dibujo que la fila de un hábito en Hoy (iconwrap + nombre + meta), reusando las
   mismas clases: un extra de comidas se mira igual que un hábito, lo que cambia es de
   dónde sale el número. Acá no hay casilleros para marcar — un extra se "marca" solo,
   cuando lo mencionás en la bitácora. */
export function MealExtraRow({ extra, semana, racha }) {
  const meta = racha > 0
    ? `${semana} esta semana · racha de ${racha} ${racha === 1 ? 'día' : 'días'}`
    : `${semana} esta semana`;

  return (
    <div className="habrow">
      <div className="iconwrap habicon" style={{ background: tint(extra.color, '24') }}>
        <HabitIcon icon={extra.icon} color={extra.color} />
      </div>

      <div className="grow">
        <div className="habname">{extra.name}</div>
        <div className="habmeta">
          {racha > 0 && <FlameIcon color={extra.color} />}
          <span>{meta}</span>
        </div>
      </div>
    </div>
  );
}
