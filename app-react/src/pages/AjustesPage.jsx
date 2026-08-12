import { useState } from 'react';
import { BackPill } from '../components/ui/BackPill';
import { Section } from '../components/ui/Section';
import { LogoutButton } from '../components/auth/LogoutButton';
import { AuthFlash } from '../components/auth/AuthFlash';
import { useAuth } from '../hooks/useAuth';
import { useSelectedDay } from '../hooks/useSelectedDay';

/* ----------------------------- AJUSTES (mínimo) -----------------------------
   El engranaje de Hoy tiene que llevar a algún lado, y hasta que exista Ajustes de verdad
   —backup, exportar, importar, tutorial— lleva acá: la cuenta con la que estás y el botón
   de cerrar sesión.

   No es una sección: es una sub-pantalla de Hoy, igual que en la app vanilla (allá era
   `ui.hoySub='ajustes'`, sin ocupar una pestaña). Por eso la barra de abajo sigue con
   "Hoy" marcado, y el botón de volver es un link a Hoy y no un history.back(): si entraste
   directo por /ajustes, "volver" tiene que llevarte a la app igual.

   El botón de cerrar sesión es el mismo componente de la etapa 1, con su confirmación. */
export function AjustesPage() {
  const { user } = useAuth();
  const [day] = useSelectedDay();
  const [error, setError] = useState(null);

  return (
    <div className="view">
      <div className="head">
        <BackPill to={{ pathname: '/', search: `?d=${day}` }} label="Hoy" />
        <h1 className="ajustes-h1">Ajustes</h1>
        <div className="sub">Tus datos viven en tu cuenta, en la nube.</div>
      </div>

      <div className="body">
        {error && <AuthFlash kind="err" msg={error} />}

        <Section label="Cuenta">
          <div className="card pad2">
            <div className="inforow">
              <span className="infoname">Sesión iniciada como</span>
              <span className="infoval">{user?.email || ''}</span>
            </div>
          </div>
          <LogoutButton onError={setError} />
        </Section>

        <Section label="Backup y datos">
          <div className="card emptycard">
            <div className="empty">
              Exportar e importar tu backup llega junto con el resto de Ajustes,
              en una etapa próxima. Mientras tanto están en la app actual.
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
