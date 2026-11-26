import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/feedback/announcement-pill/announcement-pill.css';
import '../../components/ui/controls/command-chip/command-chip.css';
import '../../components/ui/backdrops/backdrop-circuit/backdrop-circuit.css';
import '../../components/ui/blocks/hero-centered/hero-centered.css';
import '../../components/ui/data/terminal-window/terminal-window.css';
import '../../components/ui/controls/copy-button/copy-button.css';
import '../../components/ui/data/code-block/code-block.css';
import '../../components/ui/blocks/feature-grid/feature-grid.css';
import '../../components/ui/data/api-endpoint/api-endpoint.css';
import '../../components/ui/blocks/stats-band/stats-band.css';
import '../../components/ui/blocks/quote-feature/quote-feature.css';
import '../../components/ui/blocks/cta-band/cta-band.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as circuit } from '../../components/ui/backdrops/backdrop-circuit/backdrop-circuit';
import { enhance as chip } from '../../components/ui/controls/command-chip/command-chip';
import { enhance as terminal } from '../../components/ui/data/terminal-window/terminal-window';
import { enhance as code } from '../../components/ui/data/code-block/code-block';
import { enhance as stats } from '../../components/ui/blocks/stats-band/stats-band';

// No pinned moment: a developer reads code, so the page holds still. The figures settle once (stats-band).
boot({ 'stats-band': stats, 'navbar-simple': navbar, 'backdrop-circuit': circuit, 'command-chip': chip, 'terminal-window': terminal, 'code-block': code });
