import { useState, useCallback } from 'react';

export function useSidebar(initialCollapsed = false) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle   = useCallback(() => setCollapsed(prev => !prev), []);
  const collapse = useCallback(() => setCollapsed(true), []);
  const expand   = useCallback(() => setCollapsed(false), []);

  return { collapsed, toggle, collapse, expand };
}
