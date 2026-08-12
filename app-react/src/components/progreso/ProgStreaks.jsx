import { FlameIcon, HabitIcon } from '../ui/Icons';
import { EmptyCard, Section } from '../ui/Section';
import { habitBestStreak, habitStreak } from '../../lib/habits';
import { tint } from '../../lib/theme';

/* ----------------------------- RACHAS (POR HÁBITO) -----------------------------
   Port de progStreaks(). El estado actual de cada hábito: la racha en curso y el récord.
   "Estado actual" otra vez, y de nuevo por lo mismo: recortar por período no tendría
   sentido (¿cuál sería "la racha del último mes"?). */
export function ProgStreaks({ data }) {
  return (
    <Section label="Rachas" inlineNote="estado actual">
      {data.habits.length === 0 ? (
        <EmptyCard size="tight">Todavía no creaste hábitos.</EmptyCard>
      ) : (
        <div className="card managelist">
          {data.habits.map((hb) => {
            const cur = habitStreak(data, hb.id);
            const best = habitBestStreak(data, hb.id);
            const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;
            return (
              <div className="managerow" key={hb.id}>
                <div className="iconwrap habicon sm" style={{ background: tint(hb.color, '24') }}>
                  <HabitIcon icon={hb.icon} color={hb.color} />
                </div>
                <div className="grow">
                  <div className="streakrow-title">{hb.name}</div>
                  <div className="streakrow-sub">
                    {cur > 0 ? `Racha de ${dias(cur)}` : 'Sin racha activa'} · récord {dias(best)}
                  </div>
                </div>
                {cur > 0 && (
                  <div className="streak">
                    <FlameIcon color={hb.color} size={13} />
                    <span className="n" style={{ color: hb.color }}>{cur}</span>
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
