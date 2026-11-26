// The few page styles a draft needs beyond its blueprint's own: a set of plans or figures that lays out the
// number the brief has (one plan centred, never a three-column grid with one card), a picture panel where the
// blueprint drew a sample product, and the parts a blueprint did not have (a contact page, a 404). Tokens only,
// written next to the draft as part of lumina-taste/page.css.
export const DRAFT_CSS = String.raw`
/* Plans: as many columns as the brief has plans. One plan is a single card, centred. */
.pr-tiers[data-count="1"] { grid-template-columns: minmax(0, 440px); justify-content: center; }
.pr-tiers[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 820px; margin-inline: auto; }
.pr-tiers[data-count="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.pr-tiers .pr-price data { min-width: 0; }
.pr-tiers[data-count="1"] .pr-price data { font-size: var(--step-5); }
.pr-tiers { padding-bottom: var(--space-7); }
.pr-faq { padding-top: var(--space-6); }
@media (max-width: 860px) { .pr-tiers[data-count] { grid-template-columns: minmax(0, 1fr); max-width: 460px; } }

/* Figures: as many as there are true ones, on one surface. */
.bp-kpis[data-count] { grid-template-columns: repeat(var(--n, 5), minmax(0, 1fr)); }
.bp-kpis[data-count="1"] { --n: 1; } .bp-kpis[data-count="2"] { --n: 2; } .bp-kpis[data-count="3"] { --n: 3; } .bp-kpis[data-count="4"] { --n: 4; }
@media (max-width: 1040px) { .bp-kpis[data-count] { --n: 2; } }
@media (max-width: 560px) { .bp-kpis[data-count] { --n: 2; } }
.bp-main[data-one] { grid-template-columns: minmax(0, 1fr); }

/* A product's pictures: art panels until the photographs arrive. */
.sp-stage.sp-art { display: block; padding: 0; background: none; aspect-ratio: auto; border-radius: var(--radius-xl); }
.sp-stage.sp-art > [data-shot], .sp-stage.sp-art > [data-shot] > .lt-art { width: 100%; }
.sp-thumbs[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 50%; }
.sp-thumbs[data-count="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 75%; }
.sp-thumbs .sp-t.lt-art { padding: 0; border-radius: var(--radius-sm); }

/* Contact: the ways to reach a person beside the picture, then the form. */
.ct-ways { display: grid; gap: var(--space-4); margin: var(--space-6) 0 0; }
.ct-ways div { display: grid; gap: 2px; }
.ct-ways dt { color: var(--text-muted); font-size: var(--text-ui-sm); }
.ct-ways dd { margin: 0; font-size: var(--step-1); }
.ct-ways a { color: var(--text-primary); text-underline-offset: 4px; }
.ct-form { display: grid; gap: var(--space-4); max-width: 560px; }
.ct-area { display: grid; gap: var(--space-2); font-size: var(--text-ui); color: var(--text-secondary); }
.ct-area textarea { min-height: 128px; padding: var(--space-3); border: var(--bw-strong, 1px) solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-surface-1); color: var(--text-primary); font: inherit; font-size: var(--step-0); resize: vertical; }
.ct-area textarea:focus-visible { outline: var(--focus-width) solid var(--focus-ring); outline-offset: 2px; }
.ct-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: var(--space-7); align-items: start; }
.ct-split h2 { margin: 0; }
.ct-split p { margin: var(--space-3) 0 0; color: var(--text-secondary); max-width: 40ch; }
@media (max-width: 860px) { .ct-split { grid-template-columns: minmax(0, 1fr); } }
.ct-form .lt-btn { justify-self: start; }
.ct-msg:empty { display: none; }

/* Docs: each step a numbered block; the words under it are the writer's to add. */
.dc-steps { display: grid; gap: var(--space-3); margin: var(--space-5) 0 0; padding: 0; list-style: none; }
.dc-steps li { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--space-4); padding: var(--space-5); border-radius: var(--radius-lg); background: var(--bg-surface-2); scroll-margin-top: 76px; }
.dc-steps h2 { margin: 0; font-size: var(--step-1); font-weight: 650; }
.dc-steps span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--accent-solid); color: var(--accent-ink); font-weight: 650; font-variant-numeric: tabular-nums; }

/* 404: one centred block with the number as the picture. */
.nf { display: grid; place-items: center; min-height: 70dvh; padding: var(--space-8) var(--space-4); }
.nf-card { display: grid; gap: var(--space-4); width: min(100%, 640px); text-align: center; }
.nf-card h1, .nf-card p { margin: 0; }
.nf-card .bp-row { justify-content: center; }
.nf-search { justify-self: center; width: min(100%, 420px); }

/* Settings: people as rows with their initials; a quiet saved line. */
.st-team { display: grid; gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
.st-team li { display: flex; align-items: center; gap: var(--space-3); }
.st-team strong, .st-team span span { display: block; }
.st-team span span { color: var(--text-muted); font-size: var(--text-ui-sm); }
.st-team .ad-avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-text); font-size: var(--text-ui-xs); font-weight: 650; }
.st-saved { margin: 0; color: var(--status-positive); font-size: var(--text-ui-sm); }
.st-saved:empty { display: none; }

/* A desktop work app: the first cell opens the row in the inspector. */
.ws-rowbtn { padding: 0; border: 0; background: none; color: var(--text-primary); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
.ws-rowbtn:hover { text-decoration: underline; text-underline-offset: 3px; }
.ws-rowbtn:focus-visible { outline: var(--focus-width) solid var(--focus-ring); outline-offset: 2px; border-radius: var(--radius-xs); }
tr[aria-selected="true"] > td { background: var(--accent-soft); }

/* A phone app's first screen: the subject's picture over the first choice. */
.ap-cover { margin: 0 0 var(--space-5); }

/* An agent: sessions by project, the task box centred over how a task runs. */
.ag-brand { padding: var(--space-2); font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-decoration: none; }
.ag-groups { display: grid; align-content: start; gap: var(--space-5); }
.ag-groups h2 { margin: 0 0 var(--space-2); padding-inline: var(--space-2); color: var(--text-muted); font-size: var(--text-ui-xs); font-weight: 650; }
.ag-groups ul { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.ag-groups a { display: flex; align-items: center; gap: var(--space-2); min-height: 36px; padding: 0 var(--space-2); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: var(--text-ui); text-decoration: none; }
.ag-groups a:hover { background: var(--bg-surface-2); color: var(--text-primary); }
.ag-home { display: grid; align-content: center; gap: var(--space-5); width: min(100% - 32px, 720px); min-height: 100%; margin-inline: auto; padding-block: var(--space-7); }
.ag-home h1 { margin: 0; text-align: center; }
.ag-plan { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); background: var(--bg-surface-1); }
.ag-planstep { display: flex; align-items: center; gap: var(--space-3); min-height: 52px; padding: 0 var(--space-4); }
.ag-planstep + .ag-planstep { border-top: 1px solid var(--border-hairline); }
.ag-n { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--bg-surface-3); color: var(--text-secondary); font-size: var(--text-ui-xs); font-weight: 650; font-variant-numeric: tabular-nums; }

/* Sign in: the subject's drawing under the one sentence. */
.au-art { max-width: 360px; margin: 0; }

/* An article: the headline over a wide picture. */
.lt-article { display: grid; gap: var(--space-6); width: min(100% - 32px, 920px); margin-inline: auto; padding-block: var(--space-8); }
.ar-head { display: grid; gap: var(--space-3); max-width: 760px; }
.ar-head h1, .ar-head p { margin: 0; }

/* A directory: each entry a picture card. */
.dir-card .lt-art { margin-bottom: var(--space-3); }
.dir-grid { list-style: none; padding: 0; }
/* A changelog: the newest release set large before the list. */
.cl-latest { margin: 0; }
.ib-convs-wrap { display: contents; }
.ib-convs-wrap[hidden] { display: none; }
.ap-actionbar > .lt-btn:only-child { max-width: none; }
.pr-tier ul { border-top: 0; padding-top: var(--space-2); }
.pr-hero .lt-lede { font-size: var(--step-0); }
.ct-ways dd, .ct-figure { font-variant-numeric: tabular-nums; }
.ct-area textarea { min-height: 112px; }
@media (max-width: 560px) {
  .bp-topbar .lt-btn [data-part="label"] { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .bp-topbar .lt-search { min-width: 0; flex: 1; }
}
.pr-tier:not([data-featured]) { border: 0; background: var(--bg-surface-2); }
@media (min-width: 861px) { .dir-grid[data-cols="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); } .dir-grid[data-cols="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;
