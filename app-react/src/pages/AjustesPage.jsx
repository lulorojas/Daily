import { useState } from 'react';
import { BackPill } from '../components/ui/BackPill';
import { Section } from '../components/ui/Section';
import { BackupBanner } from '../components/ajustes/BackupBanner';
import { BackupSection } from '../components/ajustes/BackupSection';
import { NotificationsSection } from '../components/ajustes/NotificationsSection';
import { LogoutButton } from '../components/auth/LogoutButton';
import { AuthFlash } from '../components/auth/AuthFlash';
import { useAuth } from '../hooks/useAuth';
import { useSelectedDay } from '../hooks/useSelectedDay';
import { useOnboarding } from '../hooks/useOnboarding';
import { C, tint } from '../lib/theme';

/* ----------------------------- AJUSTES (completo) -----------------------------
   Port de viewAjustes(). Sub-pantalla de Hoy (el engranaje del header), no una sección
   propia — mismo motivo que en vanilla: la barra de abajo sigue con "Hoy" marcado, y
   "volver" es un link a Hoy y no un history.back(): si entraste directo por /ajustes,
   tiene que llevarte a la app igual. */
export function AjustesPage() {
  const { user } = useAuth();
  const [day] = useSelectedDay();
  const [error, setError] = useState(null);
  const { restartTour } = useOnboarding();

  return (
    <div className="view">
      <div className="head">
        <BackPill to={{ pathname: '/', search: `?d=${day}` }} label="Hoy" />
        <h1 className="ajustes-h1">Ajustes</h1>
        <div className="sub">Tus datos viven en tu cuenta, en la nube.</div>
      </div>

      <div className="body">
        {error && <AuthFlash kind="err" msg={error} />}

        <BackupBanner />

        <Section label="Backup">
          <BackupSection />
        </Section>

        <NotificationsSection />

        <Section label="General">
          <div className="card pad2">
            <div className="inforow sep">
              <span className="infoname">Recordatorio de backup</span>
              <span className="infoval">Cada 7 días</span>
            </div>
            <div className="inforow sep">
              <span className="infoname">Primer día de la semana</span>
              <span className="infoval">Lunes</span>
            </div>
            <div className="inforow">
              <span className="infoname">Unidad de peso</span>
              <span className="infoval">Kilogramos</span>
            </div>
          </div>
        </Section>

        <Section label="Ayuda">
          <button type="button" className="evrow ajrow" onClick={restartTour}>
            <div className="evic lg" style={{ background: tint(C.amber, '24'), color: C.amber }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 1-2.35-5.65M20 3.5V8h-4.5" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div className="evname">Ver el tutorial de nuevo</div>
              <div className="evsub">Recorré otra vez el tour guiado</div>
            </div>
            <span style={{ fontSize: '15px', color: 'rgba(242,244,248,.35)' }}>&#8250;</span>
          </button>
        </Section>

        {user && (
          <Section label="Cuenta">
            <div className="card pad2">
              <div className="inforow">
                <span className="infoname">Sesión iniciada como</span>
                <span className="infoval">{user.email || ''}</span>
              </div>
            </div>
            <div className="logout-acct">
              <LogoutButton variant="delbtn" onError={setError} />
            </div>
          </Section>
        )}

        <div className="ajversion">Daily · versión 4.0</div>
      </div>
    </div>
  );
}
