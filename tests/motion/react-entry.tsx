// React harness for the motion components, bundled in memory by tests/motion.spec.ts.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../tokens/base.css';
import '../../tokens/scroll.css';
import '../../tokens/palettes/all.css';
import '../../tokens/typography/typography.css';
import '../../components/ui/_shared/shared.css';
import '../../components/ui/data/art-panel/art-panel.css';
import { StickyStory } from '../../components/ui/blocks/sticky-story/sticky-story.react';
import { SideScroll } from '../../components/ui/blocks/side-scroll/side-scroll.react';
import { ProductReveal } from '../../components/ui/blocks/product-reveal/product-reveal.react';
import { HeroVideo } from '../../components/ui/blocks/hero-video/hero-video.react';
import { BeforeAfter } from '../../components/ui/blocks/before-after/before-after.react';
import { StatsBand } from '../../components/ui/blocks/stats-band/stats-band.react';
import { CountFigure, NumberSettle } from '../../components/ui/motion/number-settle/number-settle.react';
import { usePageTransitions } from '../../components/ui/motion/view-transition/view-transition.react';

const log: string[] = ((window as unknown as { __ltLog: string[] }).__ltLog = []);
const Art = ({ name }: { name: string }) => <figure className="lt-art" data-ratio="4/5"><p data-part="name">{name}</p></figure>;

function Names() {
  usePageTransitions();
  return <figure className="lt-art" data-vt-name="react-chair"><p data-part="name">Larkspur chair</p></figure>;
}

function App() {
  return (
    <main>
      <div data-case="story"><StickyStory title="Know the tide" steps={[{ title: 'The week', text: 'One curve.', visual: <Art name="Week" /> }, { title: 'The day', text: 'Tap Thursday.', visual: <Art name="Thursday" /> }]} /></div>
      <div data-case="side"><SideScroll title="Six buildings" items={[{ name: 'Moss Quay', fact: '2024', visual: <Art name="Moss Quay house" /> }, { name: 'Larkspur', fact: '2023', visual: <Art name="The boathouse" /> }]} /></div>
      <div data-case="reveal"><ProductReveal title="One screen" product={<Art name="Juniper Ledger" />} facts={[{ value: '30 s', label: 'to send an invoice' }]} /></div>
      <div data-case="hero"><HeroVideo title="Across in 22 minutes" lede="Every half hour." primary={{ label: 'See sailings', href: '#t' }} poster={<Art name="The 06:40" />} /></div>
      <div data-case="slider"><BeforeAfter title="Receipts" before={<p>Spreadsheet</p>} after={<p>Sorted</p>} captions={['One sheet', 'Four categories']} onChange={(v) => log.push(`slider:${v}`)} /></div>
      <div data-case="lists"><BeforeAfter title="Week one" before={['Three numbers']} after={['One number']} /></div>
      <div data-case="stats"><StatsBand title="Numbers" stats={[{ value: '2,400+', label: 'teams' }, { value: '99.98%', label: 'uptime', from: 99 }]} /></div>
      <div data-case="count"><p><CountFigure>186,400</CountFigure> people</p><NumberSettle><b data-count="">1,284</b></NumberSettle></div>
      <div data-case="names"><Names /></div>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
