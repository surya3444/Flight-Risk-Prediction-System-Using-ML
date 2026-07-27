import { createContext, useContext } from 'react';

// Context object and its hook live apart from the provider component so the
// provider file exports only components (Fast Refresh requirement).
export const OpsContext = createContext(null);

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error('useOps must be used inside an OpsProvider');
  return ctx;
}
