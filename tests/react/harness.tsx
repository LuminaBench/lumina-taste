// Mounts every React component with realistic props. Used by tests/react.spec.ts to prove the
// React implementations render, wire their behaviour and stay in sync with the vanilla markup.
import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../tokens/base.css';
import '../../tokens/palettes/all.css';
import '../../tokens/typography/typography.css';
import '../../components/ui/_shared/shared.css';

import { Rating } from '../../components/ui/controls/rating/rating.react';
import { BillingToggle } from '../../components/ui/controls/billing-toggle/billing-toggle.react';
import { ColorPicker } from '../../components/ui/controls/color-picker/color-picker.react';
import { TimeSlots } from '../../components/ui/controls/time-slots/time-slots.react';
import { SpeedDial } from '../../components/ui/navigation/speed-dial/speed-dial.react';
import { BackToTop } from '../../components/ui/navigation/back-to-top/back-to-top.react';
import { DrilldownMenu } from '../../components/ui/navigation/drilldown-menu/drilldown-menu.react';
import { NotificationCenter } from '../../components/ui/overlays/notification-center/notification-center.react';
import { ChatThread } from '../../components/ui/data/chat-thread/chat-thread.react';
import { PromptComposer } from '../../components/ui/data/prompt-composer/prompt-composer.react';
import { KanbanBoard } from '../../components/ui/data/kanban-board/kanban-board.react';
import { ImageCompare } from '../../components/ui/data/image-compare/image-compare.react';
import { TextShimmer } from '../../components/ui/motion/text-shimmer/text-shimmer.react';
import { Typewriter } from '../../components/ui/motion/typewriter/typewriter.react';
import { LogoMarquee } from '../../components/ui/motion/logo-marquee/logo-marquee.react';
import { RankedColumns } from '../../components/charts/ranked-columns/ranked-columns.react';
import { LeaderboardTable } from '../../components/charts/leaderboard-table/leaderboard-table.react';
import { TradeoffScatter } from '../../components/charts/tradeoff-scatter/tradeoff-scatter.react';
import { WaterfallChart } from '../../components/charts/waterfall-chart/waterfall-chart.react';
import { FilterChips } from '../../components/ui/controls/filter-chips/filter-chips.react';
import { InlineEdit } from '../../components/ui/controls/inline-edit/inline-edit.react';
import { MentionInput } from '../../components/ui/controls/mention-input/mention-input.react';
import { FormattingToolbar } from '../../components/ui/controls/formatting-toolbar/formatting-toolbar.react';
import { Carousel } from '../../components/ui/navigation/carousel/carousel.react';
import { HamburgerMenu } from '../../components/ui/navigation/hamburger-menu/hamburger-menu.react';
import { Lightbox } from '../../components/ui/overlays/lightbox/lightbox.react';
import { CookieConsent } from '../../components/ui/overlays/cookie-consent/cookie-consent.react';
import { Spinner, LoadingDots, BarLoader } from '../../components/ui/feedback/loaders/loaders.react';
import { SetupChecklist } from '../../components/ui/feedback/setup-checklist/setup-checklist.react';
import { MasonryGrid } from '../../components/ui/data/masonry-grid/masonry-grid.react';
import { SwipeActions } from '../../components/ui/data/swipe-actions/swipe-actions.react';
import { HeroSplit } from '../../components/ui/blocks/hero-split/hero-split.react';
import { HeroCentered } from '../../components/ui/blocks/hero-centered/hero-centered.react';
import { FeatureGrid } from '../../components/ui/blocks/feature-grid/feature-grid.react';
import { PricingTiers } from '../../components/ui/blocks/pricing-tiers/pricing-tiers.react';
import { TestimonialGrid } from '../../components/ui/blocks/testimonial-grid/testimonial-grid.react';
import { FaqSection } from '../../components/ui/blocks/faq-section/faq-section.react';
import { CtaBand } from '../../components/ui/blocks/cta-band/cta-band.react';
import { StatsBand } from '../../components/ui/blocks/stats-band/stats-band.react';
import { NewsletterSignup } from '../../components/ui/blocks/newsletter-signup/newsletter-signup.react';
import { HowItWorks } from '../../components/ui/blocks/how-it-works/how-it-works.react';
import { TeamGrid } from '../../components/ui/blocks/team-grid/team-grid.react';
import { SignInCard } from '../../components/ui/blocks/sign-in-card/sign-in-card.react';
import { NotFound } from '../../components/ui/blocks/not-found/not-found.react';
import { PasswordField } from '../../components/ui/controls/password-field/password-field.react';
import { SelectMenu } from '../../components/ui/controls/select-menu/select-menu.react';
import { UptimeBars } from '../../components/ui/data/uptime-bars/uptime-bars.react';
import { ReviewSummary } from '../../components/ui/data/review-summary/review-summary.react';
import { FileList } from '../../components/ui/data/file-list/file-list.react';
import { DiffView } from '../../components/ui/data/diff-view/diff-view.react';
import { JsonViewer } from '../../components/ui/data/json-viewer/json-viewer.react';
import { StickyActionBar } from '../../components/ui/navigation/sticky-action-bar/sticky-action-bar.react';
import { UndoSnackbar } from '../../components/ui/feedback/undo-snackbar/undo-snackbar.react';
import { ConfirmPopover } from '../../components/ui/overlays/confirm-popover/confirm-popover.react';
import { IntegrationsGrid } from '../../components/ui/blocks/integrations-grid/integrations-grid.react';
import { ContactSection } from '../../components/ui/blocks/contact-section/contact-section.react';
import { BlogGrid } from '../../components/ui/blocks/blog-grid/blog-grid.react';
import { MonthCalendar } from '../../components/ui/data/month-calendar/month-calendar.react';
import { OrderSummary } from '../../components/ui/data/order-summary/order-summary.react';
import { ProductCard } from '../../components/ui/data/product-card/product-card.react';
import { CommentThread } from '../../components/ui/data/comment-thread/comment-thread.react';
import { ActivityFeed } from '../../components/ui/data/activity-feed/activity-feed.react';
import { DeliveryTracker } from '../../components/ui/data/delivery-tracker/delivery-tracker.react';
import { PricingCalculator } from '../../components/ui/controls/pricing-calculator/pricing-calculator.react';
import { ShortcutsSheet } from '../../components/ui/overlays/shortcuts-sheet/shortcuts-sheet.react';
import { SearchResults } from '../../components/ui/data/search-results/search-results.react';
import { NavbarSimple } from '../../components/ui/navigation/navbar-simple/navbar-simple.react';
import { FlyoutMenu } from '../../components/ui/navigation/flyout-menu/flyout-menu.react';
import { NavbarCentered } from '../../components/ui/navigation/navbar-centered/navbar-centered.react';
import { AppTopbar } from '../../components/ui/navigation/app-topbar/app-topbar.react';
import { Subnav } from '../../components/ui/navigation/subnav/subnav.react';
import { FooterMinimal } from '../../components/ui/navigation/footer-minimal/footer-minimal.react';
import { FeatureSplit } from '../../components/ui/blocks/feature-split/feature-split.react';
import { LogoCloud } from '../../components/ui/blocks/logo-cloud/logo-cloud.react';
import { ArticleLayout } from '../../components/ui/blocks/article-layout/article-layout.react';
import { BeforeAfter } from '../../components/ui/blocks/before-after/before-after.react';
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

import { LineChart } from '../../components/charts/line-chart/line-chart.react';
import { BarChart } from '../../components/charts/bar-chart/bar-chart.react';
import { DonutChart } from '../../components/charts/donut-chart/donut-chart.react';
import { KpiCard } from '../../components/charts/kpi-card/kpi-card.react';
import { Sparkline } from '../../components/charts/sparkline/sparkline.react';
import { SankeyChart } from '../../components/charts/sankey-chart/sankey-chart.react';
import { SettingsList } from '../../components/ui/controls/settings-list/settings-list.react';
import { ApiKeyField } from '../../components/ui/controls/api-key-field/api-key-field.react';
import { UsageMeters } from '../../components/ui/data/usage-meters/usage-meters.react';
import { PlanCard } from '../../components/ui/data/plan-card/plan-card.react';
import { TeamMembers } from '../../components/ui/data/team-members/team-members.react';
import { DangerZone } from '../../components/ui/controls/danger-zone/danger-zone.react';
import { Treemap } from '../../components/charts/treemap/treemap.react';
import { GanttChart } from '../../components/charts/gantt-chart/gantt-chart.react';
import { WaffleChart } from '../../components/charts/waffle-chart/waffle-chart.react';
import { RadialBarChart } from '../../components/charts/radial-bar-chart/radial-bar-chart.react';

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

      <Case id="navbar"><NavbarMega brand="Halyard" megaLabel="Product" columns={[{ label: 'P', links: [{ label: 'Analytics', description: 'Charts', href: '#a', icon: 'chart' }] }]} links={[{ label: 'Docs', href: '#d' }]} cta={{ label: 'Start', href: '#s' }} /></Case>
      <Case id="autohide"><HideOnScrollHeader><strong>Header</strong></HideOnScrollHeader></Case>
      <Case id="sidebar"><div style={{ display: 'flex', width: 700 }}><AppSidebar workspace="Halyard" sections={[{ items: [{ label: 'Home', href: '#h', icon: 'home', current: true }] }]} /></div></Case>
      <Case id="bottom-nav"><BottomNav current="#h" items={[{ label: 'Home', href: '#h', icon: 'home' }, { label: 'Inbox', href: '#i', icon: 'inbox', badge: 2 }]} /></Case>
      <Case id="dock"><MagnifyDock items={[{ label: 'Mail', href: '#m', icon: 'mail' }, { label: 'Files', href: '#f', icon: 'folder', divider: true }]} /></Case>
      <Case id="waffle"><WaffleLauncher apps={[{ label: 'Mail', href: '#m', icon: 'mail' }]} /></Case>
      <Case id="account"><AccountMenu name="Riya Mehta" email="riya@example.com" items={[{ label: 'Profile', href: '#p', icon: 'user' }]} /></Case>
      <Case id="toc"><h3 id="r-a">A</h3><ScrollspyToc items={[{ id: 'r-a', label: 'A' }]} /></Case>
      <Case id="crumbs"><Breadcrumbs items={[{ label: 'Home', href: '#' }, { label: 'Projects', href: '#p' }, { label: 'Atlas' }]} /></Case>
      <Case id="wizard"><StepperWizard steps={['Account', 'Team', 'Done']} initialStep={2} /></Case>
      <Case id="pagination"><Pagination total={12} page={3} onPageChange={(p) => record(`page:${p}`)} /></Case>
      <Case id="footer"><SiteFooter brand="Halyard" blurb="Analytics." columns={[{ title: 'Product', links: [{ label: 'Pricing', href: '#p' }] }]} legal={['© 2026 Halyard']} /></Case>
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
      <Case id="chart-line"><LineChart data={{ x: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], values: [3, 5, 4, 6] }} options={{ title: 'Line', format: { suffix: ' fps' } }} /></Case>
      <Case id="chart-bar"><BarChart data={[{ label: 'A', value: 3 }, { label: 'B', value: 5 }]} options={{ title: 'Bars' }} /></Case>
      <Case id="chart-donut"><DonutChart data={[{ label: 'A', value: 3 }, { label: 'B', value: 5 }]} options={{ title: 'Donut' }} /></Case>
      <Case id="chart-sankey"><SankeyChart data={{ nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], links: [{ source: 'a', target: 'b', value: 5 }] }} options={{ title: 'Flow' }} /></Case>
      <Case id="chart-kpi"><KpiCard data={{ label: 'Revenue', value: 24400, previous: 21000, spark: [1, 2, 3, 2, 4] }} options={{ format: { prefix: '£', compact: true } }} /></Case>
      <Case id="chart-spark">Trend <Sparkline values={[1, 3, 2, 5, 4]} label="Trend" /></Case>
      <Case id="rating"><Rating legend="Rate it" defaultValue={3} onChange={(v) => log.push(`rating:${v}`)} /></Case>
      <Case id="billing"><BillingToggle plan="Team" monthly="£24" yearly="£19" onChange={(p) => log.push(`billing:${p}`)} /></Case>
      <Case id="color"><ColorPicker legend="Colour" swatches={[{ name: 'Ocean', value: '#2f6fb0' }, { name: 'Clay', value: '#c0623f' }]} onChange={(c) => log.push(`color:${c}`)} /></Case>
      <Case id="slots"><TimeSlots day="Tuesday" zone="GMT" defaultValue="10:00" groups={[{ label: 'Morning', slots: [{ time: '09:00' }, { time: '09:30', booked: true }, { time: '10:00' }] }]} onChange={(t) => log.push(`slot:${t}`)} /></Case>
      <Case id="dial"><div style={{ position: 'relative', height: 220 }}><SpeedDial label="Create" actions={[{ label: 'Upload', icon: 'upload' }, { label: 'Folder', icon: 'folder' }]} onAction={(a) => log.push(`dial:${a}`)} /></div></Case>
      <Case id="totop"><BackToTop><h3>Article</h3><p style={{ height: 900 }}>Long text</p></BackToTop></Case>
      <Case id="drill"><DrilldownMenu items={[{ label: 'Products', children: [{ label: 'Analytics', href: '#a' }] }, { label: 'Pricing', href: '#p' }]} /></Case>
      <Case id="notify"><NotificationCenter items={[{ id: '1', who: 'Ana López', verb: 'commented on', what: 'Q4', time: '2m', unread: true }, { id: '2', who: 'Kai', verb: 'assigned', what: 'Churn', time: '1h' }]} onUnreadChange={(n) => log.push(`unread:${n}`)} /></Case>
      <Case id="chat"><ChatThread label="Chat" day="Today" groups={[{ id: 'a', from: 'them', name: 'Riya', initials: 'RM', time: '09:41', messages: [{ id: 'm1', from: 'them', text: 'Hi' }] }, { id: 'b', from: 'me', time: '09:42', messages: [{ id: 'm2', from: 'me', text: 'Hello' }], status: 'Read' }]} typing={{ initials: 'RM', name: 'Riya' }} /></Case>
      <Case id="composer"><PromptComposer onSend={(t) => log.push(`send:${t}`)} /></Case>
      <Case id="kanban"><KanbanBoard columns={[{ id: 'todo', title: 'To do', cards: [{ id: 'c1', title: 'One', tag: 'Bug', who: 'AL' }] }, { id: 'done', title: 'Done', cards: [] }]} onMove={(c, col) => log.push(`kanban:${c}:${col}`)} /></Case>
      <Case id="compare"><ImageCompare before={<span />} after={<span />} beforeLabel="Before" afterLabel="After" caption="Compare" /></Case>
      <Case id="shimmer"><TextShimmer>Loading…</TextShimmer><span /></Case>
      <Case id="typewriter"><Typewriter prefix="Build" words={['pages', 'apps']} /></Case>
      <Case id="marquee"><LogoMarquee lead="Trusted by" logos={[{ name: 'Halyard' }, { name: 'Moss' }]} /></Case>
      <Case id="chart-ranked"><RankedColumns data={[{ label: 'A', value: 3, group: 'X' }, { label: 'B', value: null, group: 'Y' }]} options={{ title: 'Ranked' }} /></Case>
      <Case id="chart-leader"><LeaderboardTable data={{ columns: [{ name: 'Score' }, { name: 'Price', better: 'low' }], rows: [{ label: 'A', group: 'X', values: [3, 1] }, { label: 'B', group: 'Y', values: [2, 2] }] }} options={{ title: 'Board' }} /></Case>
      <Case id="chart-tradeoff"><TradeoffScatter data={[{ label: 'A', x: 1, y: 3 }, { label: 'B', x: 2, y: 5 }, { label: 'C', x: 3, y: 4 }]} options={{ title: 'Trade-off', quadrant: true }} /></Case>
      <Case id="chart-waterfall"><WaterfallChart data={[{ label: 'Start', value: 10 }, { label: 'Up', value: 4 }, { label: 'End', value: 0, total: true }]} options={{ title: 'Bridge' }} /></Case>
      <Case id="filter-chips"><FilterChips label="Team" options={['Design', 'Sales']} onChange={(x) => log.push(`chips:${x.join('+')}`)} /></Case>
      <Case id="inline-edit"><InlineEdit label="Name" defaultValue="Atlas" onSave={(v) => log.push(`rename:${v}`)} /></Case>
      <Case id="mention"><MentionInput label="Comment" people={[{ name: 'Ana López', handle: 'ana' }]} onMention={(h) => log.push(`mention:${h}`)} /></Case>
      <Case id="toolbar"><FormattingToolbar text="Hello" onChange={(st) => log.push(`bold:${st.bold}`)} /></Case>
      <Case id="carousel"><Carousel label="Posts" slides={[{ kicker: 'Guide', title: 'One', href: '#1', meta: '2 min' }, { kicker: 'Guide', title: 'Two', href: '#2', meta: '3 min' }]} /></Case>
      <Case id="burger"><HamburgerMenu brand="Halyard" links={[{ label: 'Product', href: '#p', current: true }]} cta={{ label: 'Start', href: '#s' }} /></Case>
      <Case id="lightbox"><Lightbox label="Photos" photos={[{ title: 'One', alt: 'First photo' }, { title: 'Two', alt: 'Second photo' }]} /></Case>
      <Case id="consent"><div style={{ position: 'relative', height: 200, contain: 'layout paint' }}><CookieConsent text="Essential cookies only unless you agree." onChoice={(c) => log.push(`consent:${c.analytics}`)} /></div></Case>
      <Case id="loaders"><Spinner /><LoadingDots /><BarLoader /></Case>
      <Case id="checklist"><SetupChecklist title="Get set up" steps={[{ title: 'One', done: true }, { title: 'Two' }]} onChange={(d) => log.push(`done:${d}`)} /></Case>
      <Case id="masonry"><MasonryGrid label="Boards">{[<p key="a">A</p>, <p key="b">B</p>]}</MasonryGrid></Case>
      <Case id="swipe"><SwipeActions label="Inbox" rows={[{ id: '1', from: 'Kai', subject: 'Hi', time: '09:00' }]} onAction={(a) => log.push(`swipe:${a}`)} /></Case>
      <Case id="hero-split"><HeroSplit title="One page" lede="All numbers." primary={{ label: 'Start', href: '#s' }} notes={['No card']} /></Case>
      <Case id="hero-centered"><HeroCentered title="Reports" lede="Plain charts." primary={{ label: 'Start', href: '#s' }} announcement={{ label: 'New', text: 'Alerts', href: '#a' }} /></Case>
      <Case id="feature-grid"><FeatureGrid title="Why" features={[{ icon: 'bell', title: 'Alerts', text: 'When numbers move.' }]} /></Case>
      <Case id="pricing-tiers"><PricingTiers title="Pricing" tiers={[{ name: 'Team', for: 'Teams', price: '£24', per: 'per seat', features: ['Alerts'], cta: { label: 'Start', href: '#t' }, featured: true }]} /></Case>
      <Case id="testimonials"><TestimonialGrid title="Customers" quotes={[{ quote: 'One number now.', name: 'Riya Mehta', role: 'Finance' }]} /></Case>
      <Case id="faq-section"><FaqSection title="Questions" items={[{ q: 'Can I cancel?', a: 'Yes.' }]} /></Case>
      <Case id="cta-band"><CtaBand title="Start now" primary={{ label: 'Start', href: '#s' }} /></Case>
      <Case id="stats-band"><StatsBand title="Numbers" stats={[{ value: '180 ms', label: 'median query' }]} /></Case>
      <Case id="newsletter"><NewsletterSignup title="One email a month" onSubscribe={(e) => log.push(`sub:${e}`)} /></Case>
      <Case id="how-it-works"><HowItWorks title="Three steps" steps={[{ title: 'Connect', text: 'Point it at a database.' }]} /></Case>
      <Case id="team-grid"><TeamGrid title="Team" people={[{ name: 'Ana López', role: 'Engineering' }]} /></Case>
      <Case id="sign-in"><SignInCard product="Halyard" onEmail={(e) => log.push(`signin:${e}`)} /></Case>
      <Case id="not-found"><NotFound title="Not here" lede="Try search." links={[{ label: 'Home', href: '#h' }]} /></Case>
      <Case id="password"><PasswordField onChange={(n) => log.push(`pw:${n}`)} /></Case>
      <Case id="select-menu"><SelectMenu label="Role" options={[{ value: 'admin', label: 'Admin', description: 'Manage people' }, { value: 'viewer', label: 'Viewer' }]} defaultValue="viewer" onChange={(v) => log.push(`role:${v}`)} /></Case>
      <Case id="uptime"><UptimeBars services={[{ name: 'API', uptime: '99.9%', days: ['ok', 'warn', 'ok', 'down'] }]} /></Case>
      <Case id="reviews"><ReviewSummary average={4.6} counts={[80, 15, 3, 1, 1]} /></Case>
      <Case id="files"><FileList files={[{ name: 'a.pdf', type: 'PDF', size: '1 MB', owner: 'Ana', when: 'Today', href: '#a' }]} /></Case>
      <Case id="diff"><DiffView file="a.ts" lines={[{ kind: 'del', old: 1, text: 'a' }, { kind: 'add', new: 1, text: 'b' }]} /></Case>
      <Case id="json"><JsonViewer value={{ a: 1, b: [true, null] }} /></Case>
      <Case id="action-bar"><div style={{ position: 'relative', height: 120, contain: 'layout paint' }}><StickyActionBar label="Buy" price="£179" note="In stock"><button type="button" className="lt-btn" data-variant="primary">Add to basket</button></StickyActionBar></div></Case>
      <Case id="undo"><UndoSnackbar open message="Deleted." onUndo={() => log.push('undo')} /></Case>
      <Case id="confirm"><ConfirmPopover label="Revoke" question="Revoke this key?" confirmLabel="Revoke key" onConfirm={() => log.push('revoked')} /></Case>
      <Case id="integrations"><IntegrationsGrid title="Integrations" items={[{ name: 'Postgres', kind: 'Database', href: '#pg' }]} /></Case>
      <Case id="contact"><ContactSection email="hello@example.com" onSend={() => log.push('sent')} /></Case>
      <Case id="blog"><BlogGrid posts={[{ kind: 'Guide', title: 'Post', href: '#p', date: '1 Nov', read: '3 min' }]} /></Case>
      <Case id="month"><MonthCalendar title="December 2026" startWeekday={1} days={31} today={1} events={[{ day: 9, title: 'Board' }]} onSelect={(d) => log.push(`day:${d}`)} /></Case>
      <Case id="order"><OrderSummary items={[{ name: 'Team plan', detail: '12 seats', amount: 288 }]} /></Case>
      <Case id="product"><ProductCard name="Tote" href="#t" price="£48" was="£60" colours={[{ name: 'Sand', value: 'oklch(0.86 0.04 80)' }]} /></Case>
      <Case id="comments"><CommentThread comments={[{ id: '1', name: 'Ana', initials: 'AL', time: '2h', text: 'Looks good.' }]} onComment={(t) => log.push(`comment:${t}`)} /></Case>
      <Case id="activity"><ActivityFeed items={[{ id: '1', icon: 'check-circle', tone: 'pos', text: 'Deploy finished', time: '09:41' }]} /></Case>
      <Case id="tracker"><DeliveryTracker title="Arriving today" steps={[{ label: 'Ordered', when: '2 Dec', done: true }, { label: 'Delivered', when: 'Today', current: true }]} /></Case>
      <Case id="calc"><PricingCalculator onChange={(t) => log.push(`total:${t.total}`)} /></Case>
      <Case id="shortcuts"><ShortcutsSheet open={false} onClose={() => {}} groups={[{ title: 'General', items: [{ label: 'Search', keys: ['⌘', 'K'] }] }]} /><span>closed</span></Case>
      <Case id="results"><SearchResults query="forecast" hits={[{ kind: 'Doc', title: 'Q4', meta: 'Finance', snippet: 'the forecast', href: '#q' }]} /></Case>
      <Case id="nav-simple"><NavbarSimple brand="Halyard" links={[{ label: 'Pricing', href: '#p', current: true }]} cta={{ label: 'Start', href: '#s' }} /></Case>
      <Case id="flyout"><FlyoutMenu brand="Halyard" groups={[{ label: 'Product', items: [{ icon: 'chart', label: 'Analytics', description: 'Numbers', href: '#a' }] }]} cta={{ label: 'Start', href: '#s' }} /></Case>
      <Case id="nav-centered"><NavbarCentered brand="NORD" links={[{ label: 'New in', href: '#n' }]} /></Case>
      <Case id="topbar"><AppTopbar workspace="Halyard" plan="Team" initials="AL" unread={3} /></Case>
      <Case id="subnav"><Subnav title="Q4 revenue" links={[{ label: 'Overview', href: '#o', current: true }, { label: 'Reports', href: '#r', count: 12 }]} /></Case>
      <Case id="footer-min"><FooterMinimal owner="Halyard Labs" links={[{ label: 'Privacy', href: '#p' }]} note="Made in Lisbon" /></Case>
      <Case id="feature-split"><FeatureSplit label="Features" rows={[{ title: 'Connect', text: 'Read only.', points: ['Encrypted'], visual: <span /> }]} /></Case>
      <Case id="logo-cloud"><LogoCloud lead="Used by" logos={[{ name: 'Halyard' }, { name: 'Moss' }]} /></Case>
      <Case id="article"><ArticleLayout title="Define a metric" toc={[{ id: 'why', label: 'Why' }]}><p>Body</p></ArticleLayout></Case>
      <Case id="before-after"><BeforeAfter title="Week one" before={['Three numbers']} after={['One number']} /></Case>
      <Case id="settings"><SettingsList title="Notifications" rows={[{ id: 'a', label: 'Weekly digest', defaultOn: true }]} onChange={(k, v) => log.push(`setting:${k}=${v}`)} /></Case>
      <Case id="api-key"><ApiKeyField label="Secret key" value="hy_demo_key_1234" meta="Created 2 Nov" /></Case>
      <Case id="usage"><UsageMeters items={[{ label: 'Seats', used: '18', limit: '20', percent: 90 }]} /></Case>
      <Case id="plan"><PlanCard plan="Team" period="Monthly" price="£240" facts={[{ term: 'Seats', value: '20' }]} /></Case>
      <Case id="members"><TeamMembers members={[{ name: 'Ana Lopes', email: 'ana@halyard.io', role: 'Admin', status: 'Active' }]} /></Case>
      <Case id="danger"><DangerZone name="halyard" impact="Deletes all reports." onDelete={() => log.push('deleted')} /></Case>
      <Case id="treemap"><Treemap data={[{ label: 'A', value: 3, group: 'X' }, { label: 'B', value: 1, group: 'Y' }]} options={{ title: 'Spend' }} /></Case>
      <Case id="gantt"><GanttChart data={[{ label: 'Plan', start: '2026-11-02', end: '2026-11-20', done: 0.5 }]} options={{ title: 'Plan' }} /></Case>
      <Case id="waffle"><WaffleChart data={{ label: 'of teams', value: 68 }} options={{ title: 'Share' }} /></Case>
      <Case id="radial"><RadialBarChart data={[{ label: 'Goal', value: 70 }]} options={{ title: 'Goals' }} /></Case>
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
