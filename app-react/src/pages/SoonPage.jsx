import { SectionIcon } from '../components/ui/Icons';
import { tint } from '../lib/theme';

/* Las tres secciones que todavía no se migraron (Gimnasio, Hábitos y Progreso).

   Están en la barra desde ahora, con su color y su ícono, para que la navegación sea la
   misma que en la app actual y no haya que rehacerla después. Al tocarlas se llega acá.

   Cuando cada pantalla exista, se cambia una línea en AppRoutes y esta página desaparece
   sola: nada más depende de ella. */
export function SoonPage({ section }) {
  return (
    <div className="view">
      <div className="head">
        <div className="kicker accent">Etapa 3b</div>
        <h1>{section.title}</h1>
        <div className="sub">Esta sección todavía no se migró a la versión nueva.</div>
      </div>
      <div className="body">
        <div className="emptybig">
          <div className="emptyart" style={{ background: tint(section.accent, '1A'), color: section.accent }}>
            <SectionIcon section={section.key} size="56px" />
          </div>
          <div className="et">Falta poco</div>
          <div className="ex">
            Mientras tanto, {section.title} sigue funcionando como siempre en la app actual.
            Tus datos son los mismos en las dos.
          </div>
        </div>
      </div>
    </div>
  );
}
