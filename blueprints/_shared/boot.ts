// Shared blueprint bootstrap: tokens, base styles and auto-enhancement of every [data-lt] component.
import '../../tokens/base.css';
import '../../tokens/layout.css';
import '../../tokens/backdrops.css';
import '../../tokens/composition.css';
import '../../tokens/scroll.css';
import '../../tokens/palettes/all.css';
import '../../tokens/typography/typography.css';
import '../../components/ui/_shared/shared.css';
import './blueprint.css';
import { autoEnhance, type Enhancer } from '../../components/ui/_shared/dom';

/**
 * Boot a blueprint page. When opened standalone, it adopts the last theme chosen in the gallery
 * (lumina-taste preview); inside the gallery iframe the parent keeps the attributes in sync.
 */
export function boot(registry: Record<string, Enhancer>) {
  if (window === window.parent) {
    try {
      const s = JSON.parse(localStorage.getItem('lt-gallery') ?? '{}') as Record<string, string>;
      for (const k of ['palette', 'mode', 'type', 'density', 'radius', 'motion']) if (typeof s[k] === 'string' && /^[a-z-]+$/.test(s[k])) document.documentElement.dataset[k] = s[k];
    } catch { /* storage unavailable */ }
  }
  return autoEnhance(document, registry);
}
