import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/blocks/hero-statement/hero-statement.css';
import '../../components/ui/blocks/visit-info/visit-info.css';
import '../../components/ui/data/bento-grid/bento-grid.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/blocks/cta-band/cta-band.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as visit } from '../../components/ui/blocks/visit-info/visit-info';

boot({ 'navbar-simple': navbar, 'visit-info': visit });
