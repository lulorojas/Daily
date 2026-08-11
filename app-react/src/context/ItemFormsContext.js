import { createContext } from 'react';

/* El contexto va en su propio archivo, sin componentes al lado, por la misma razón que
   AuthContext: así el archivo que lo exporta no re-ejecuta nada al importarse y el
   Fast Refresh de Vite no se marea. */
export const ItemFormsContext = createContext(null);
