import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './authContextValue';
import { OpsContext } from './opsContextValue';
import { monitorApi, errorMessage } from '../services/api';

/**
 * The live operations feed.
 *
 * Continuous monitoring runs on the server whether or not a browser is open;
 * this is the client's window onto it. One poll, shared by every screen, so the
 * incident badge in the nav and the Ops Centre board can never show different
 * numbers.
 */

const POLL_MS = 20000;

export function OpsProvider({ children }) {
  const { user } = useContext(AuthContext);

  const [summary, setSummary] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Guards against a slow response from a previous user landing in a new
  // session's state after a logout/login.
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const mine = ++generation.current;

    try {
      const response = await monitorApi.opsSummary();
      if (generation.current !== mine) return;
      setSummary(response.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (generation.current !== mine) return;
      setError(errorMessage(err, 'Could not reach the operations feed.'));
    } finally {
      if (generation.current === mine) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      generation.current++;
      setSummary(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [user, refresh]);

  // The escalation policy is static for the session — fetch once so every
  // screen renders the same thresholds the server is actually enforcing.
  useEffect(() => {
    if (!user || policy) return;
    monitorApi
      .policy()
      .then((r) => setPolicy(r.data))
      .catch(() => setPolicy(null));
  }, [user, policy]);

  const value = {
    summary,
    policy,
    thresholds: policy?.thresholds || null,
    loading,
    error,
    lastUpdated,
    refresh,
    openIncidents: summary?.counters?.openIncidents || 0,
    pollSeconds: POLL_MS / 1000,
  };

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}
