import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/floating-pill-nav/floating-pill-nav.css';
import '../../components/ui/data/media-card/media-card.css';
import '../../components/ui/motion/scroll-reveal/scroll-reveal.css';
import './page.css';
import { enhance as pillNav } from '../../components/ui/navigation/floating-pill-nav/floating-pill-nav';
import { enhance as reveal } from '../../components/ui/motion/scroll-reveal/scroll-reveal';

boot({ 'floating-pill-nav': pillNav, 'scroll-reveal': reveal });
