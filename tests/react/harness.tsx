// Mounts every React component with realistic props. Used by tests/react.spec.ts to prove the
// React implementations render, wire their behaviour and stay in sync with the vanilla markup.
import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../tokens/base.css';
import '../../tokens/palettes/all.css';
import '../../tokens/typography/typography.css';
import '../../components/ui/_shared/shared.css';

import { Disclosure } from '../../components/ui/controls/disclosure-chevron/disclosure-chevron.react';
import { Accordion } from '../../components/ui/controls/accordion/accordion.react';
import { TreeView } from '../../components/ui/controls/tree-view/tree-view.react';
import { ThemeSwitch } from '../../components/ui/controls/theme-switch/theme-switch.react';
import { SegmentedControl } from '../../components/ui/controls/segmented-control/segmented-control.react';
import { ToggleSwitch } from '../../components/ui/controls/toggle-switch/toggle-switch.react';
import { Checkbox } from '../../components/ui/controls/checkbox/checkbox.react';
import { RadioGroup } from '../../components/ui/controls/radio-group/radio-group.react';
import { RadioCards } from '../../components/ui/controls/radio-cards/radio-cards.react';
import { OtpInput } from '../../components/ui/controls/otp-input/otp-input.react';
import { RangeSlider } from '../../components/ui/controls/range-slider/range-slider.react';
import { DualRangeSlider } from '../../components/ui/controls/dual-range-slider/dual-range-slider.react';
import { Button } from '../../components/ui/controls/button/button.react';
import { SplitButton } from '../../components/ui/controls/split-button/split-button.react';
import { CopyButton } from '../../components/ui/controls/copy-button/copy-button.react';
import { TagInput } from '../../components/ui/controls/tag-input/tag-input.react';
import { SearchInput } from '../../components/ui/controls/search-input/search-input.react';
import { TextField, ValidatedForm } from '../../components/ui/controls/text-field/text-field.react';
import { DateRangePicker } from '../../components/ui/controls/date-range-picker/date-range-picker.react';
import { Combobox } from '../../components/ui/controls/combobox/combobox.react';
import { FileDropzone } from '../../components/ui/controls/file-dropzone/file-dropzone.react';
import { NumberStepper } from '../../components/ui/controls/number-stepper/number-stepper.react';

import { NavbarMega } from '../../components/ui/navigation/navbar-mega/navbar-mega.react';
import { HideOnScrollHeader } from '../../components/ui/navigation/hide-on-scroll-header/hide-on-scroll-header.react';
import { AppSidebar } from '../../components/ui/navigation/app-sidebar/app-sidebar.react';
import { BottomNav } from '../../components/ui/navigation/bottom-nav/bottom-nav.react';
import { MagnifyDock } from '../../components/ui/navigation/magnify-dock/magnify-dock.react';
import { WaffleLauncher } from '../../components/ui/navigation/waffle-launcher/waffle-launcher.react';
import { AccountMenu } from '../../components/ui/navigation/account-menu/account-menu.react';
import { ScrollspyToc } from '../../components/ui/navigation/scrollspy-toc/scrollspy-toc.react';
import { Breadcrumbs } from '../../components/ui/navigation/breadcrumbs/breadcrumbs.react';
import { StepperWizard } from '../../components/ui/navigation/stepper-wizard/stepper-wizard.react';
import { Pagination } from '../../components/ui/navigation/pagination/pagination.react';
import { SiteFooter } from '../../components/ui/navigation/site-footer/site-footer.react';
import { FloatingPillNav } from '../../components/ui/navigation/floating-pill-nav/floating-pill-nav.react';
import { Tabs } from '../../components/ui/navigation/tabs/tabs.react';

import { CountUp } from '../../components/ui/feedback/count-up/count-up.react';
import { Odometer } from '../../components/ui/feedback/odometer/odometer.react';
import { FlipClock } from '../../components/ui/feedback/flip-clock/flip-clock.react';
import { StatusDot } from '../../components/ui/feedback/status-dot/status-dot.react';
import { ProgressBar } from '../../components/ui/feedback/progress-bar/progress-bar.react';
import { ProgressRing } from '../../components/ui/feedback/progress-ring/progress-ring.react';
import { SegmentedMeter } from '../../components/ui/feedback/meter/meter.react';
import { Skeleton } from '../../components/ui/feedback/skeleton/skeleton.react';
import { EmptyState } from '../../components/ui/feedback/empty-state/empty-state.react';
import { ToastProvider, useToast } from '../../components/ui/feedback/toast-stack/toast-stack.react';
import { Callout } from '../../components/ui/feedback/callout/callout.react';
import { Banner } from '../../components/ui/feedback/banner/banner.react';
import { Badge } from '../../components/ui/feedback/badge/badge.react';
import { Kbd } from '../../components/ui/feedback/kbd/kbd.react';

import { CommandPalette } from '../../components/ui/overlays/command-palette/command-palette.react';
import { SelectionBubble } from '../../components/ui/overlays/selection-bubble/selection-bubble.react';
import { BulkActionTable } from '../../components/ui/overlays/bulk-action-bar/bulk-action-bar.react';
import { QueryBuilder } from '../../components/ui/overlays/query-builder/query-builder.react';
import { DropdownMenu } from '../../components/ui/overlays/dropdown-menu/dropdown-menu.react';
import { ContextMenu } from '../../components/ui/overlays/context-menu/context-menu.react';
import { Tooltip } from '../../components/ui/overlays/tooltip/tooltip.react';
import { Popover } from '../../components/ui/overlays/popover/popover.react';
import { HoverCard } from '../../components/ui/overlays/hover-card/hover-card.react';
import { Drawer } from '../../components/ui/overlays/drawer/drawer.react';
import { ConfirmDialog } from '../../components/ui/overlays/modal-dialog/modal-dialog.react';
import { BottomSheet } from '../../components/ui/overlays/bottom-sheet/bottom-sheet.react';
import { CoachMarkTour } from '../../components/ui/overlays/coach-mark/coach-mark.react';

import { DataTable } from '../../components/ui/data/data-table/data-table.react';
import { VirtualList } from '../../components/ui/data/virtual-list/virtual-list.react';
import { demoRow } from '../../components/ui/data/virtual-list/virtual-list';
import { BentoGrid, BentoTile } from '../../components/ui/data/bento-grid/bento-grid.react';
import { CardStack } from '../../components/ui/data/card-stack/card-stack.react';
import { ComparisonTable } from '../../components/ui/data/comparison-table/comparison-table.react';
import { Timeline } from '../../components/ui/data/timeline/timeline.react';
import { SplitPane } from '../../components/ui/data/split-pane/split-pane.react';
import { SortableList } from '../../components/ui/data/sortable-list/sortable-list.react';
import { CodeBlock } from '../../components/ui/data/code-block/code-block.react';
import { StatStrip } from '../../components/ui/data/stat-strip/stat-strip.react';
import { MediaCard } from '../../components/ui/data/media-card/media-card.react';
import { AvatarStack } from '../../components/ui/data/avatar-stack/avatar-stack.react';
import { DescriptionList } from '../../components/ui/data/description-list/description-list.react';
import { FilterBar } from '../../components/ui/data/filter-bar/filter-bar.react';

import { MOTION, transition } from '../../components/ui/motion/motion-tokens/motion-tokens.react';
import { useViewTransition } from '../../components/ui/motion/view-transition/view-transition.react';
import { ScrollReveal } from '../../components/ui/motion/scroll-reveal/scroll-reveal.react';
import { SpotlightCard } from '../../components/ui/motion/cursor-spotlight/cursor-spotlight.react';
import { Optical } from '../../components/ui/motion/optical-align/optical-align.react';
import { PRESS } from '../../components/ui/motion/tactile-press/tactile-press.react';
import { Stagger } from '../../components/ui/motion/stagger-in/stagger-in.react';

const log: string[] = [];
(window as unknown as { __ltLog: string[] }).__ltLog = log;
const record = (msg: string) => { log.push(msg); };

function Case({ id, children }: { id: string; children: ReactNode }) {
  return <section data-case={id} style={{ padding: 16, borderBottom: '1px solid var(--border-hairline)' }}><h2 style={{ font: '600 12px var(--font-mono)', color: 'var(--text-muted)', margin: '0 0 8px' }}>{id}</h2>{children}</section>;
}

function ToastDemo() {
  const toast = useToast();
  return <Button variant="secondary" onClick={() => toast({ title: 'Saved', body: 'All good.', tone: 'positive' })}>Toast</Button>;
}
function Dialogs() {
  const [d, setD] = useState(false);
  const [dr, setDr] = useState(false);
  const [sh, setSh] = useState(false);
  return (
    <>
      <Button data-open="dialog" onClick={() => setD(true)}>Dialog</Button>
      <Button data-open="drawer" onClick={() => setDr(true)}>Drawer</Button>
      <Button data-open="sheet" onClick={() => setSh(true)}>Sheet</Button>
      <ConfirmDialog open={d} title="Delete?" description="This cannot be undone." confirmLabel="Delete" danger onClose={(ok) => { setD(false); record(`dialog:${ok}`); }} />
      <Drawer open={dr} title="Filters" onClose={() => setDr(false)}><p>Body</p></Drawer>
      <BottomSheet open={sh} title="Options" actions={[{ label: 'Copy link', icon: 'link' }]} onClose={() => setSh(false)} />
    </>
  );
}
function VT() {
  const run = useViewTransition();
  const [grid, setGrid] = useState(true);
  return <Button onClick={() => run(() => setGrid((g) => !g))}>{grid ? 'Grid' : 'List'}</Button>;
}
const accounts = [
  { name: 'Harbour & Co', mrr: 12400, plan: 'Scale' },
  { name: 'Kestrel Labs', mrr: 4820, plan: 'Team' },
  { name: 'Moss Studio', mrr: 2150, plan: 'Team' },
];

function App() {
  return (
    <ToastProvider>
      <Case id="disclosure"><Disclosure label="Advanced" onOpenChange={(o) => record(`disclosure:${o}`)}><p>Hidden</p></Disclosure></Case>
      <Case id="accordion"><Accordion items={[{ title: 'One', content: 'A' }, { title: 'Two', content: 'B' }]} onChange={(ids) => record(`accordion:${ids.length}`)} /></Case>
      <Case id="tree"><TreeView label="Files" nodes={[{ label: 'src', expanded: true, children: [{ label: 'main.ts', selected: true }] }]} /></Case>
      <Case id="theme-switch"><ThemeSwitch target="#react-scope" /></Case>
      <Case id="segmented"><SegmentedControl label="Range" options={[{ value: 'd', label: 'Day' }, { value: 'w', label: 'Week' }]} defaultValue="w" onChange={(v) => record(`segmented:${v}`)} /></Case>
      <Case id="toggle"><ToggleSwitch label="Email" defaultChecked /></Case>
      <Case id="checkbox"><Checkbox label="Mixed" indeterminate /></Case>
      <Case id="radio"><RadioGroup legend="Region" options={[{ value: 'eu', label: 'EU' }, { value: 'us', label: 'US' }]} defaultValue="eu" /></Case>
      <Case id="radio-cards"><RadioCards legend="Plan" options={[{ value: 'a', title: 'A', price: '£0', priceValue: 0, unit: 'mo' }, { value: 'b', title: 'B' }]} defaultValue="a" /></Case>
      <Case id="otp"><OtpInput expected="123456" onComplete={(c, ok) => record(`otp:${c}:${ok}`)} /></Case>
      <Case id="range"><RangeSlider label="Opacity" detents={[0, 50, 100]} unit="%" /></Case>
      <Case id="dual-range"><DualRangeSlider label="Price" min={0} max={1000} defaultValue={[200, 800]} prefix="£" /></Case>
      <Case id="button"><Button variant="primary" icon="check">Save</Button> <Button loading>Saving</Button> <Button iconOnly icon="settings" aria-label="Settings" /></Case>
      <Case id="split-button"><SplitButton label="Merge" menuLabel="More" actions={[{ label: 'Squash' }, { label: 'Rebase' }]} onAction={(a) => record(`split:${a}`)} /></Case>
      <Case id="copy"><CopyButton value="hello" /></Case>
      <Case id="tags"><TagInput label="Emails" defaultValues={['a@x.io', 'b@x.io', 'c@x.io', 'd@x.io']} /></Case>
      <Case id="search"><SearchInput label="Search docs" shortcut="j" /></Case>
      <Case id="text-field"><ValidatedForm><TextField label="Email" type="email" required help="Work email" /></ValidatedForm></Case>
      <Case id="date-range"><DateRangePicker label="Period" month="2026-11" defaultStart="2026-11-10" defaultEnd="2026-11-16" /></Case>
      <Case id="combobox"><Combobox label="City" options={[{ value: 'lon', label: 'London' }, { value: 'tok', label: 'Tokyo' }]} onChange={(o) => record(`combobox:${o.value}`)} /></Case>
      <Case id="dropzone"><FileDropzone /></Case>
      <Case id="stepper"><NumberStepper label="Seats" min={1} max={5} defaultValue={2} /></Case>

      <Case id="navbar"><NavbarMega brand="Acme" megaLabel="Product" columns={[{ label: 'P', links: [{ label: 'Analytics', description: 'Charts', href: '#a', icon: 'chart' }] }]} links={[{ label: 'Docs', href: '#d' }]} cta={{ label: 'Start', href: '#s' }} /></Case>
      <Case id="autohide"><HideOnScrollHeader><strong>Header</strong></HideOnScrollHeader></Case>
      <Case id="sidebar"><div style={{ display: 'flex', width: 700 }}><AppSidebar workspace="Acme" sections={[{ items: [{ label: 'Home', href: '#h', icon: 'home', current: true }] }]} /></div></Case>
      <Case id="bottom-nav"><BottomNav current="#h" items={[{ label: 'Home', href: '#h', icon: 'home' }, { label: 'Inbox', href: '#i', icon: 'inbox', badge: 2 }]} /></Case>
      <Case id="dock"><MagnifyDock items={[{ label: 'Mail', href: '#m', icon: 'mail' }, { label: 'Files', href: '#f', icon: 'folder', divider: true }]} /></Case>
      <Case id="waffle"><WaffleLauncher apps={[{ label: 'Mail', href: '#m', icon: 'mail' }]} /></Case>
      <Case id="account"><AccountMenu name="Riya Mehta" email="riya@example.com" items={[{ label: 'Profile', href: '#p', icon: 'user' }]} /></Case>
      <Case id="toc"><h3 id="r-a">A</h3><ScrollspyToc items={[{ id: 'r-a', label: 'A' }]} /></Case>
      <Case id="crumbs"><Breadcrumbs items={[{ label: 'Home', href: '#' }, { label: 'Projects', href: '#p' }, { label: 'Atlas' }]} /></Case>
      <Case id="wizard"><StepperWizard steps={['Account', 'Team', 'Done']} initialStep={2} /></Case>
      <Case id="pagination"><Pagination total={12} page={3} onPageChange={(p) => record(`page:${p}`)} /></Case>
      <Case id="footer"><SiteFooter brand="Acme" blurb="Analytics." columns={[{ title: 'Product', links: [{ label: 'Pricing', href: '#p' }] }]} legal={['© 2026 Acme']} /></Case>
      <Case id="pillnav"><FloatingPillNav links={[{ label: 'Work', href: '#w' }, { label: 'About', href: '#a' }]} current="#w" cta={{ label: 'Contact', href: '#c' }} /></Case>
      <Case id="tabs"><Tabs label="Views" tabs={[{ label: 'One', content: 'A' }, { label: 'Two', content: 'B', count: 3 }]} /></Case>

      <Case id="count-up"><CountUp value={24400} format="currency" currency="GBP" compact /></Case>
      <Case id="odometer"><Odometer value={18426} label="Orders" /></Case>
      <Case id="flip"><FlipClock seconds={3600} /></Case>
      <Case id="status"><StatusDot tone="positive" live /> Operational</Case>
      <Case id="progress"><ProgressBar label="Upload" value={40} /><ProgressBar label="Indexing" /></Case>
      <Case id="ring"><ProgressRing value={72} label="Storage" /></Case>
      <Case id="meter"><SegmentedMeter label="Storage" unit="GB" total={256} segments={[{ label: 'Media', value: 96 }, { label: 'Docs', value: 48 }]} /></Case>
      <Case id="skeleton"><div aria-busy="true" aria-label="Loading"><Skeleton shape="circle" /><Skeleton width="60%" /></div></Case>
      <Case id="empty"><EmptyState title="No reports" body="Create one." actions={<Button variant="primary">New</Button>} /></Case>
      <Case id="toast"><ToastDemo /></Case>
      <Case id="callout"><Callout tone="warning" title="Careful">Check contrast.</Callout></Case>
      <Case id="banner"><Banner>Announcement</Banner></Case>
      <Case id="badge"><Badge tone="positive" dot>Active</Badge><Badge variant="count" label="3 unread">3</Badge></Case>
      <Case id="kbd"><Kbd keys="⌘ K" /></Case>

      <Case id="cmdk"><CommandPalette groups={[{ label: 'Go', commands: [{ id: 'a', label: 'Open settings', icon: 'settings' }] }]} onRun={(c) => record(`cmdk:${c}`)} /></Case>
      <Case id="bubble"><SelectionBubble>Select some of this text.</SelectionBubble></Case>
      <Case id="bulk"><BulkActionTable caption="Rows" rows={accounts} rowLabel={(r) => r.name} columns={[{ label: 'Name', render: (r) => r.name }]} actions={[{ id: 'del', label: 'Delete', icon: 'trash', danger: true }]} /></Case>
      <Case id="query"><QueryBuilder onChange={(q) => record(`query:${q}`)} /></Case>
      <Case id="dropdown"><DropdownMenu label="Actions" entries={[{ type: 'item', label: 'Rename', icon: 'edit' }, { type: 'check', label: 'Pinned', checked: true }, { type: 'sub', label: 'Move', items: ['A', 'B'] }, { type: 'separator' }, { type: 'item', label: 'Delete', danger: true }]} onAction={(d) => record(`dropdown:${d.action ?? d.toggle}`)} /></Case>
      <Case id="context"><ContextMenu label="File" entries={[{ type: 'item', label: 'Open' }]}>File</ContextMenu></Case>
      <Case id="tooltip"><Tooltip content="Bold"><button type="button" aria-label="Bold">B</button></Tooltip></Case>
      <Case id="popover"><Popover trigger="Share" title="Share"><p>Link</p></Popover></Case>
      <Case id="hovercard"><HoverCard href="#ana" label="@ana"><strong>Ana</strong></HoverCard></Case>
      <Case id="dialogs"><Dialogs /></Case>
      <Case id="tour"><CoachMarkTour><span data-tour="1" data-title="Search" data-body="Find things">Search</span></CoachMarkTour></Case>

      <Case id="table"><DataTable caption="Accounts" rowKey={(r) => r.name} columns={[{ key: 'name', label: 'Account' }, { key: 'mrr', label: 'MRR', numeric: true, render: (r) => `£${r.mrr.toLocaleString()}` }]} rows={accounts} detail={(r) => r.plan} /></Case>
      <Case id="vlist"><VirtualList label="Log" count={5000} renderRow={demoRow} /></Case>
      <Case id="bento"><BentoGrid label="Highlights"><BentoTile span="wide" title="Fast" /><BentoTile title="Safe" /></BentoGrid></Case>
      <Case id="card-stack"><CardStack cards={[{ title: 'One', body: 'A' }, { title: 'Two', body: 'B' }]} /></Case>
      <Case id="compare"><ComparisonTable caption="Plans" plans={['A', 'B']} featured="B" groups={[{ title: 'Usage', rows: [{ label: 'SSO', values: [false, true] }] }]} /></Case>
      <Case id="timeline"><Timeline items={[{ date: '2026-11-24', label: '24 Nov', title: 'v4.2', body: 'Alerts', latest: true }]} /></Case>
      <Case id="split-pane"><SplitPane left="L" right="R" leftLabel="Left" rightLabel="Right" /></Case>
      <Case id="sortable"><SortableList items={[{ id: '1', label: 'One' }, { id: '2', label: 'Two' }]} onReorder={(o) => record(`sort:${o.join(',')}`)} /></Case>
      <Case id="code"><CodeBlock file="a.ts" snippets={[{ language: 'TS', code: 'const a = 1;' }, { language: 'Shell', code: 'npm i' }]} /></Case>
      <Case id="stats"><StatStrip stats={[{ label: 'Revenue', value: 24400, display: '£24.4k', delta: '12%', direction: 'up', good: true }]} /></Case>
      <Case id="media"><MediaCard href="#c" media={<svg viewBox="0 0 16 10" />} title="Case study" meta="6 min" /></Case>
      <Case id="avatars"><AvatarStack people={['Ana López', 'Kai Morgan', 'Lee Park', 'Sam Okafor', 'Mo Ali']} /></Case>
      <Case id="dl"><DescriptionList items={[{ term: 'Region', value: 'EU' }]} /></Case>
      <Case id="filter-bar"><FilterBar ranges={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }]} range="30d" filters={['Plan: Team']} onRangeChange={() => {}} onRemove={() => {}} onAdd={() => {}} onReset={() => {}} /></Case>

      <Case id="motion"><div style={{ transition: transition(['opacity'], 'fast') }}>{MOTION.ease.spring}</div></Case>
      <Case id="vt"><VT /></Case>
      <Case id="reveal"><ScrollReveal><p className="lt-reveal">Revealed</p></ScrollReveal></Case>
      <Case id="spotlight"><SpotlightCard><h3>Card</h3></SpotlightCard></Case>
      <Case id="optical"><Optical trail>Docs →</Optical></Case>
      <Case id="press"><button type="button" className={PRESS}>Press</button></Case>
      <Case id="stagger"><Stagger><span>One</span><span>Two</span></Stagger></Case>
    </ToastProvider>
  );
}

const host = document.getElementById('root')!;
host.id = 'root';
host.setAttribute('data-palette', 'slate-forest');
host.setAttribute('data-mode', 'light');
const scope = document.createElement('div');
scope.id = 'react-scope';
host.before(scope);
createRoot(host).render(<StrictMode><App /></StrictMode>);
