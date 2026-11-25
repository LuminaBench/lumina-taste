import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/blocks/hero-statement/hero-statement.css';
import '../../components/ui/blocks/service-list/service-list.css';
import '../../components/ui/blocks/team-grid/team-grid.css';
import '../../components/ui/blocks/pricing-tiers/pricing-tiers.css';
import '../../components/ui/blocks/visit-info/visit-info.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';

boot({ 'navbar-simple': navbar });
