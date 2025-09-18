import {useEffect} from 'react';

/**
 * `useEffect` that registers an event listener
 */
export function useEmitter<T extends {on: Function; off: Function}>(
  emitter: T,
  event: string,
  handler: (...args: any[]) => void
) {
  useEffect(() => {
    emitter.on(event, handler);
    
    // 'clean up' by removing the listener if any dependency changes
    //
    // (this will run the cleanup with the old values, and re-run the setup
    // with the new values)
    return () => {
      emitter.off(event, handler);
    };
  }, [emitter, event, handler]);
}