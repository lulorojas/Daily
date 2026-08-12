import { FlameIcon } from '../ui/Icons';
import { EmptyCard, Section } from '../ui/Section';
import { gymTypeStreaks, typeColor } from '../../lib/gym';

/* ----------------------------- RACHAS DE ENTRENAMIENTO -----------------------------
   Port de progGymStreaks(). Por TIPO, no por hábito (esas son ProgStreaks, más abajo):
   cuántas semanas seguidas se entrenó cada tipo. "Estado actual" porque no depende del
   selector de período — una racha es siempre sobre el presente, recortarla por "último
   mes" no significa nada. */
export function ProgGymStreaks({ data }) {
  const streaks = gymTypeStreaks(data);

  return (
    <Section label="Rachas de entrenamiento" inlineNote="estado actual">
      {streaks.length === 0 ? (
        <EmptyCard size="tight">Repetí un tipo de entreno dos semanas seguidas para arrancar una racha.</EmptyCard>
      ) : (
        <div className="card managelist">
          {streaks.map((s) => {
            const col = typeColor(data, s.type);
            const enRacha = s.weeks >= 2;
            return (
              <div className="managerow" key={s.type}>
                <span className="typedot" style={{ background: col }} />
                <div className="grow">
                  <div className="streakrow-title">{s.type}</div>
                  <div className="streakrow-sub">
                    {s.weeks} {s.weeks === 1 ? 'semana seguida' : 'semanas seguidas'}
                    {!enRacha && ' · una más y arranca la racha'}
                  </div>
                </div>
                {enRacha && (
                  <div className="streak">
                    <FlameIcon color={col} size={13} />
                    <span className="n" style={{ color: col }}>{s.weeks}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
