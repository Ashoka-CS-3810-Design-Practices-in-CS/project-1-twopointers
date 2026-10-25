// Hash routing with plain tokens (#bst, #graph, #compare...). No router
// library needed for seven pages, and plain tokens survive being shared as a
// link on any static host.

import { useEffect, useState } from 'react';
import type { StructureId } from '../core/types';

export type Route = 'home' | 'compare' | StructureId;

const ROUTES: Route[] = ['home', 'compare', 'bst', 'graph', 'heap', 'stack', 'queue'];

export function parseRoute(hash: string): Route {
  const token = hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(token) ? token : 'home';
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const isStructure = (route: Route): route is StructureId =>
  route !== 'home' && route !== 'compare';

export const href = (route: Route) => (route === 'home' ? '#home' : `#${route}`);
