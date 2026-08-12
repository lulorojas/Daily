import { donutSlices } from '../../lib/charts';

/* ----------------------------- DONA DE DISTRIBUCIÓN -----------------------------
   Port de donut(). La usa Progreso para el balance muscular: una porción por tipo de
   entreno, del tamaño de su proporción sobre el total. */
export function Donut({ slices, size, thick }) {
  const rings = donutSlices(slices, size, thick);
  if (!rings.length) return null;
  const R = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={R}
          cy={R}
          r={ring.r.toFixed(2)}
          fill="none"
          stroke={ring.color}
          strokeWidth={thick}
          strokeDasharray={ring.dasharray}
          strokeDashoffset={ring.dashoffset.toFixed(2)}
          transform={`rotate(-90 ${R} ${R})`}
        />
      ))}
    </svg>
  );
}
