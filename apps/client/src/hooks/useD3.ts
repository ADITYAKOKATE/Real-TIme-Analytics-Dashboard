import { useEffect, useRef, MutableRefObject } from 'react';
import * as d3 from 'd3';

/**
 * useD3 hook — bridges React with D3.
 * D3 renders inside useEffect; React manages the container ref.
 * Re-renders D3 when deps change.
 */
export function useD3<T extends Element>(
  renderFn: (selection: d3.Selection<T, unknown, null, undefined>) => void,
  deps: React.DependencyList
): MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const selection = d3.select(ref.current);
    renderFn(selection);

    return () => {
      // Cleanup: remove all D3-managed children on re-render
      selection.selectAll('*').remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
