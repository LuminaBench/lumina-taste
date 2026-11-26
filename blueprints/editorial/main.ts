import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/floating-pill-nav/floating-pill-nav.css';
import '../../components/ui/blocks/side-scroll/side-scroll.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/motion/scroll-reveal/scroll-reveal.css';
import './page.css';
import { enhance as pillNav } from '../../components/ui/navigation/floating-pill-nav/floating-pill-nav';
import { enhance as reveal } from '../../components/ui/motion/scroll-reveal/scroll-reveal';
import { enhance as sideScroll } from '../../components/ui/blocks/side-scroll/side-scroll';

// One scroll moment: the work slides sideways while the page scrolls (side-scroll); a swipe row on phones.
boot({ 'floating-pill-nav': pillNav, 'scroll-reveal': reveal, 'side-scroll': sideScroll });
