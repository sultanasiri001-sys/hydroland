import {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {productError, useProduct} from './product-context';
import {ApiError} from './api';
import {sessionGeneration, SessionChangedError} from './session';

/** Read state is bound to both the account generation and its current authority fingerprint. */
export function useProductResource<T>(load: (signal: AbortSignal) => Promise<T>, dependencies: unknown[] = [], options: {public?: boolean} = {}) {
  const context = useProduct(), {authKey, current, locale} = context;
  const language = useRef(locale); language.current = locale;
  const [state, setState] = useState<{key: string; data: T | null; loading: boolean; error: string}>({key: authKey, data: null, loading: true, error: ''});
  const sequence = useRef(0), controller = useRef<AbortController | null>(null), loader = useRef(load);
  loader.current = load;
  const refresh = useCallback(async () => {
    const ticket = ++sequence.current, generation = sessionGeneration(), key = authKey;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setState({key, data: null, loading: true, error: ''});
    try {
      if (!options.public) {
        const profile = await context.refreshProfile();
        if (!profile) throw new ApiError(401, 'Authentication required.');
        if (!current(key)) return;
      }
      const data = await loader.current(abort.signal);
      if (ticket === sequence.current && !abort.signal.aborted && generation === sessionGeneration() && (options.public || current(key))) setState({key, data, loading: false, error: ''});
    } catch (error) {
      if (ticket === sequence.current && !abort.signal.aborted && generation === sessionGeneration() && (options.public || current(key))) setState({key, data: null, loading: false, error: productError(error, language.current)});
    }
  // Explicit caller keys invalidate record selection without trusting a previously loaded row.
  }, [authKey, current, context.refreshProfile, options.public, ...dependencies]);
  useFocusEffect(useCallback(() => {void refresh(); return () => {sequence.current++; controller.current?.abort();};}, [refresh]));
  useEffect(() => () => {sequence.current++; controller.current?.abort();}, []);
  const visible = state.key === authKey && (options.public || current(authKey)) ? state : {key: authKey, data: null, loading: true, error: ''};
  return {data: visible.data, loading: visible.loading, error: visible.error, refresh};
}
export function useProductAction() {
  const {authKey, current, ensureCurrent, locale} = useProduct();
  const [state, setState] = useState({key: authKey, busy: false, error: '', message: ''});
  const active = useRef(true), running = useRef(false);
  useEffect(() => {active.current = true; running.current = false; setState({key: authKey, busy: false, error: '', message: ''});
    return () => {active.current = false; running.current = false;};}, [authKey]);
  const run = async <T>(operation: () => Promise<T>, success: string, options: {public?: boolean} = {}): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true; const key = authKey, generation = sessionGeneration();
    const alive = () => active.current && generation === sessionGeneration() && (options.public || current(key));
    setState({key, busy: true, error: '', message: ''});
    try {
      if (!options.public) await ensureCurrent(key);
      if (!alive()) throw new SessionChangedError();
      const value = await operation();
      if (!alive()) return undefined;
      setState({key, busy: false, error: '', message: success}); return value;
    } catch (error) {
      if (alive()) setState({key, busy: false, error: productError(error, locale), message: ''});
      return undefined;
    } finally {if (alive()) running.current = false;}
  };
  return {...(state.key === authKey ? state : {key: authKey, busy: false, error: '', message: ''}), run,
    clear: () => setState({key: authKey, busy: false, error: '', message: ''})};
}
