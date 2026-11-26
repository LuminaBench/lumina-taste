import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/blocks/hero-split/hero-split.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/blocks/offer-cards/offer-cards.css';
import '../../components/ui/blocks/sticky-story/sticky-story.css';
import '../../components/ui/blocks/before-after/before-after.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/blocks/cta-band/cta-band.css';
import '../../components/ui/navigation/site-footer/site-footer.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as story } from '../../components/ui/blocks/sticky-story/sticky-story';
import { enhance as beforeAfter } from '../../components/ui/blocks/before-after/before-after';
import { enhance as art } from '../../components/ui/data/art-panel/art-panel';

// One scroll moment: the making, pinned (sticky-story). The glaze slider is the visitor's to move.
boot({ 'navbar-simple': navbar, 'sticky-story': story, 'before-after': beforeAfter, 'art-panel': art });
