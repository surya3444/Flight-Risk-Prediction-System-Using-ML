import { createContext } from 'react';

// The context object lives in its own module so the provider file can export
// only components — Fast Refresh cannot handle a file that mixes the two.
export const AuthContext = createContext(null);
