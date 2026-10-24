import { createContext, useContext } from './lib.js';
// Owner session and restaurant, shared by every page
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
