import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/blocks/hero-split/hero-split.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/blocks/scroll-statement/scroll-statement.css';
import '../../components/ui/data/bento-grid/bento-grid.css';
import '../../components/ui/blocks/stack-cards/stack-cards.css';
import '../../components/ui/data/invoice-sheet/invoice-sheet.css';
import '../../components/ui/blocks/team-grid/team-grid.css';
import '../../components/ui/blocks/visit-info/visit-info.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/blocks/cta-band/cta-band.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as statement } from '../../components/ui/blocks/scroll-statement/scroll-statement';
import { enhance as visit } from '../../components/ui/blocks/visit-info/visit-info';
import { enhance as art } from '../../components/ui/data/art-panel/art-panel';

// Two scroll moments, apart: the statement (the price promise) and the first visit as stacking cards.
boot({ 'navbar-simple': navbar, 'scroll-statement': statement, 'visit-info': visit, 'art-panel': art });
