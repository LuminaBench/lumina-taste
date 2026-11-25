# Which one?

Generated from `components/ui/compare.json` by `scripts/build-catalog.mjs`. Pairs people mix up, with one rule to pick between them.

## Tooltip, popover or hover card?

If it only names something, it is a tooltip. If people act inside it, it is a popover. If it previews a person or link on hover, it is a hover card.

| Element | id | Use it for |
| --- | --- | --- |
| Anchored tooltip | `tooltip` | A short label for an icon button. Text only, never links or buttons. |
| Anchored popover | `popover` | A small panel with controls (share, filter, quick edit). Opens on click. |
| Hover preview card | `hover-card` | A preview of a profile or link. Opens after a short hover or on focus. |

## Modal, drawer or bottom sheet?

Ask for a decision in a modal, show detail or filters in a drawer, and offer actions on phones in a bottom sheet.

| Element | id | Use it for |
| --- | --- | --- |
| Modal dialog | `modal-dialog` | One question that blocks progress: confirm, rename, delete. |
| Slide-over drawer | `drawer` | Detail or filters next to a list the user still wants to see. |
| Mobile bottom sheet | `bottom-sheet` | A short list of actions on mobile, within thumb reach. |

## Toast, banner or callout?

Confirm something that just happened with a toast, announce something about the whole product with a banner, and explain something on this page with a callout.

| Element | id | Use it for |
| --- | --- | --- |
| Toast stack | `toast-stack` | "Saved", "Invite sent". Disappears on its own; never the only record of an error. |
| Announcement banner | `banner` | Maintenance, a new release, a billing problem. One at a time, dismissible. |
| Callout | `callout` | A tip or warning inside content. Stays put. |

## Checkbox or toggle switch?

A switch takes effect immediately; a checkbox waits for Save.

| Element | id | Use it for |
| --- | --- | --- |
| Checkbox | `checkbox` | Choices in a form that is submitted, or picking several items in a list. |
| Toggle switch | `toggle-switch` | Settings that apply the moment you flip them. |

## Tabs or segmented control?

Tabs switch between different content; a segmented control changes how the same content is shown.

| Element | id | Use it for |
| --- | --- | --- |
| Tabs | `tabs` | Overview, Activity, Settings: separate panels. |
| Segmented control | `segmented-control` | 1D / 1W / 1M on one chart, or List / Grid on one list. |

## Radio group, radio cards or combobox?

Up to five options: show them all as radios. Options that need a description or a price: radio cards. Long lists: a combobox people can type into.

| Element | id | Use it for |
| --- | --- | --- |
| Radio group | `radio-group` | 2–5 short options that all fit on screen. |
| Radio cards | `radio-cards` | Plans or regions where each option needs a line of detail. |
| Combobox | `combobox` | Time zones, countries, people: too many to show. |

## Accordion or disclosure?

One hidden section is a disclosure; a stack of them is an accordion.

| Element | id | Use it for |
| --- | --- | --- |
| Accordion | `accordion` | FAQs and grouped settings. Usually one open at a time. |
| Disclosure chevron | `disclosure-chevron` | A single "Advanced options" or "Show details". |

## Skeleton or spinner?

If you know the layout that is coming, show a skeleton of it. If you do not, or the wait is a single action, use a spinner.

| Element | id | Use it for |
| --- | --- | --- |
| Shimmer skeleton | `skeleton` | Lists, cards and dashboards while data loads. |
| Loaders | `loaders` | A button that is saving, or a short wait with no known shape. |

## Pagination or carousel?

Use pagination when people need to find a specific item again; use a carousel only for a short, optional row of extras.

| Element | id | Use it for |
| --- | --- | --- |
| Pagination bar | `pagination` | Search results, tables, archives: stable positions people can return to. |
| Carousel | `carousel` | Related posts or a few highlights. Never for content people must see. |

## Dropdown menu, context menu or command palette?

A dropdown holds actions for one visible button, a context menu repeats actions for the thing under the pointer, and a command palette reaches every action by typing.

| Element | id | Use it for |
| --- | --- | --- |
| Dropdown menu with submenu | `dropdown-menu` | "Actions" on a page header or row. |
| Context menu | `context-menu` | Right-click on a file or a row. Always also reachable another way. |
| Command palette (⌘K) | `command-palette` | Power users jumping anywhere with ⌘K. |

## Progress bar, progress ring or meter?

Progress is a task moving towards done; a meter is a level that can go up or down.

| Element | id | Use it for |
| --- | --- | --- |
| Progress bar | `progress-bar` | Uploads and multi-step tasks with room for a label. |
| Circular progress ring | `progress-ring` | Compact progress in a card corner or avatar. |
| Multi-segment meter | `meter` | Storage used, quota, a score. Not a task. |

## Sidebar, top navbar or bottom nav?

Marketing sites use a top navbar, apps with many sections use a sidebar, and phone apps with 3–5 destinations use a bottom nav.

| Element | id | Use it for |
| --- | --- | --- |
| Collapsible app sidebar | `app-sidebar` | 5–15 sections used every day. |
| Navbar with mega dropdown | `navbar-mega` | A public site with a product menu and a few pages. |
| Mobile bottom nav | `bottom-nav` | A mobile app's main destinations, always one tap away. |

## Count-up, odometer or flip clock?

Count up once to reveal a figure, roll digits when a live number changes, and flip for a countdown people watch.

| Element | id | Use it for |
| --- | --- | --- |
| Count-up number | `count-up` | A headline KPI the first time it scrolls into view. |
| Rolling odometer | `odometer` | A live total that ticks up while people watch. |
| Split-flap flip clock | `flip-clock` | A countdown to a launch or a deadline. |

## Data table or virtual list?

Compare values across columns in a table; scroll through thousands of single-line items in a virtual list.

| Element | id | Use it for |
| --- | --- | --- |
| Sortable data table | `data-table` | Accounts, invoices, anything sorted and compared by column. |
| Virtualised list | `virtual-list` | Logs, messages, events: long and mostly read top to bottom. |

## Date picker, date range or month calendar?

One date someone knows: the date picker, which takes typing. A start and an end: the range picker. Seeing what falls on which day: the month calendar.

| Element | id | Use it for |
| --- | --- | --- |
| Date picker | `date-picker` | A due date, a booking day, a deadline. Typed or picked. |
| Date range picker | `date-range-picker` | A reporting period, a stay, a filter between two dates. |
| Month calendar | `month-calendar` | A schedule to read: events laid out on their days. |

## Hold to confirm, confirm popover or danger zone?

How often, and how bad? Frequent and recoverable: hold. Occasional: a small popover by the button. Rare and permanent: type the name.

| Element | id | Use it for |
| --- | --- | --- |
| Hold to confirm | `hold-to-confirm` | Deleting list items many times a day, where a dialog each time would be noise. |
| Confirm popover | `confirm-popover` | Removing a member, discarding a draft: one extra click, next to the button. |
| Danger zone | `danger-zone` | Deleting a workspace or an account: typed confirmation, on its own section. |

## Row list or settings list?

Rows that take you somewhere are a row list. Rows you change in place are a settings list.

| Element | id | Use it for |
| --- | --- | --- |
| Row list | `row-list` | A settings or account home: each row opens a screen and shows its current value. |
| Settings list | `settings-list` | Switches and choices that save as you change them. |

## Command chip, code block or terminal window?

One line to copy: the chip. Code to read or paste: the block. Showing what happens when you run it: the terminal.

| Element | id | Use it for |
| --- | --- | --- |
| Command chip | `command-chip` | An install or run command beside a hero button or in a docs step. |
| Code block | `code-block` | A working example, with tabs per language and a copy button. |
| Terminal window | `terminal-window` | A short session, typed once: the commands and their real output. |

## Device frame, showcase tabs or sticky story?

One screen to show: a device frame. Several products or themes to compare: showcase tabs. A process with an order: a sticky story.

| Element | id | Use it for |
| --- | --- | --- |
| Device frame | `device-frame` | A screenshot or live screen in a hero or a feature row. |
| Showcase tabs | `showcase-tabs` | Three or four examples the reader flips between. |
| Sticky story | `sticky-story` | Steps where the picture changes as the text scrolls. |
