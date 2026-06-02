// ============================================
// FamTastic — Portal
// Renderar barn till document.body så att modaler/bottom-sheets hamnar
// UTANFÖR vyernas stacking-contexts. Annars fångas en overlay (även med
// hög z-index) i t.ex. en `position:relative; z-index:1`-wrapper eller en
// `backdrop-filter`-header, och målas bakom den fasta nav-baren / sticky-
// headern. Genom att portalera till body blir `position:fixed; z-index`
// relativt viewporten och lägger sig korrekt över allt annat.
// ============================================

import { createPortal } from 'react-dom';

export function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
