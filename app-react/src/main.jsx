import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { DataProvider } from './context/DataProvider';
import { App } from './App';

// El CSS se importa como si fuera código: Vite lo procesa, lo junta y en producción le
// pone un hash en el nombre para que el caché del navegador nunca sirva una versión vieja.
import './styles/styles.css';
import './styles/auth.css';
import './styles/app.css';

/* Punto de entrada. Las tres capas, de afuera hacia adentro:
     StrictMode   → solo en desarrollo: monta y desmonta todo dos veces para delatar
                    efectos mal escritos (suscripciones que no se limpian, por ejemplo).
     BrowserRouter→ conecta la URL del navegador con las rutas.
     AuthProvider → la sesión, disponible para toda la app.
     DataProvider → los datos del usuario. Va ADENTRO del de sesión porque depende de él:
                    arranca el sync recién cuando hay un uid verificado. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
