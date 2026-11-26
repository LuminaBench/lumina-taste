// lumina-taste gallery. Vanilla TS, bundled by scripts/build.mjs.
// One bundle, two pages: the gallery itself, or (?stage=<id>) a bare stage that the Moments and Before / after
// views load in an iframe, so a scroll moment has a real viewport of its own to scroll.
import '../tokens/base.css';
import '../tokens/layout.css';
import '../tokens/backdrops.css';
import '../tokens/composition.css';
import '../tokens/scroll.css';
import '../tokens/palettes/all.css';
import '../tokens/typography/typography.css';
import '../tokens/styles/styles.css';
import '../components/ui/_shared/shared.css';
import './gallery.css';
import { STAGE, bootStage } from './stage';

if (STAGE) bootStage(STAGE);
else void import('./app');
