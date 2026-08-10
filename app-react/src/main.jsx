import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { App } from './App';

// El CSS se importa como si fuera código: Vite lo procesa, lo junta y en producción le
// pone un hash en el nombre para que el caché del navegador nunca sirva una versión vieja.
import './styles/styles.css';
import './styles/auth.css';

/* Punto de entrada. Las tres capas, de afuera hacia adentro:
     StrictMode   → solo en desarrollo: monta y desmonta todo dos veces para delatar
                    efectos mal escritos (suscripciones que no se limpian, por ejemplo).
     BrowserRouter→ conecta la URL del navegador con las rutas.
     AuthProvider → la sesión, disponible para toda la app. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
