# Copy patterns

Words are half of what makes a page look designed. Generated pages fail on copy before they fail on colour: vague headlines, three buttons that all say "Get started", empty states that say "No data". Use these formulas, fill them with the product's real nouns and numbers, then run `node scripts/lint-copy.mjs`.

The test for every line: could a competitor paste it onto their site unchanged? If yes, it says nothing. Rewrite it with something only this product can claim.

## Headlines

| Where | Formula | Before | After |
| --- | --- | --- | --- |
| Hero | The outcome, for whom, in 10 words or fewer | Welcome to the future of invoicing | Get paid for freelance work in days, not months |
| Hero (tool) | Verb + object + the hard part made easy | The best way to monitor your site | Know your site is down before your customers do |
| Section | A fact or result, not a category | Features | Every invoice tracks itself |
| Feature row | What changes for the user | Powerful automation | Reminders go out on day 7, 14 and 30 without you |
| Dashboard title | The question the page answers | Analytics | Revenue this quarter |
| Chart title | The takeaway, then the measure in the subtitle | Monthly revenue | Team plan pulled ahead in March |
| Pricing | What it costs and what decides the price | Simple, transparent pricing | £12 a month per person, billed by seat |
| Docs page | The task, as the reader would say it | Event ingestion overview | Send your first event |

Rules: sentence case, no full stop on single-line headlines, `text-wrap: balance`, no colon-separated two-part slogans, no rhetorical questions.

## Supporting lines (ledes)

One sentence that says **how**: the mechanism, a number, or the thing it replaces.

- "Tally sends the invoice, chases it on day 7, 14 and 30, and tells you when it is paid."
- "Checks run every 30 seconds from 12 regions; you get a text within a minute of an outage."

## Buttons and links

- **Verb + object**, 1–3 words: "Start free trial", "Export CSV", "Invite people", "Pay £162.15".
- The label says what happens next. "Continue" is fine inside a flow; "Submit" and "Click here" never are.
- The primary label repeats on the closing CTA band. Secondary actions differ in kind ("Watch a 2-minute demo"), not in wording ("Get started" vs "Start now").
- Destructive buttons name the thing: "Delete Halyard workspace", not "Confirm".
- Include the amount on payment buttons and the count on bulk actions ("Deactivate 3 users").

## Reassurance lines

Under a CTA, one fact that removes the main worry: "No card required", "Cancel from Settings any time", "Free for up to 3 people", "Your data stays in the EU". One line, not a row of badges.

## Forms

- Labels are nouns ("Work email"), never placeholders posing as labels.
- Help text says why or what format: "We send receipts here." / "As it appears on invoices."
- Errors say what to do: "Enter a full email address, for example name@company.com." Not "Invalid input".
- Keep what people typed after an error.

## Empty states

Formula: **what will appear here** + **why it is empty** + **one action**.

| Before | After |
| --- | --- |
| No data | No invoices yet. Invoices you send appear here with their payment status. [Create invoice] |
| No results | Nothing matches "kestrel" in Active users. [Clear the filter] |
| Nothing to see here | You are all caught up. New comments on your reports land here. |

## Errors and outages

Formula: **what failed** + **what was not affected or lost** + **what to do now**.

- "Users could not be loaded. The directory service did not answer in time. Your filters are kept. [Try again]"
- "Your card was declined. Nothing was charged. Check the number and expiry date, or use another card."
- Never blame the person, never "Oops", never an error code alone.

## Confirmations and toasts

Past tense, the object, and the undo when there is one: "Invite sent to ana@halyard.dev.", "Report archived. [Undo]". No "Success!".

## Dialogs

Title is the question with the object: "Delete Q4 board report?". Body says the consequence in one sentence: "Teammates lose access and the link stops working. This cannot be undone." Buttons: "Cancel" and "Delete report".

## Pricing

- Tier name, then who it is for in one line ("For teams up to 20").
- List only what differs between tiers, 4–6 lines each, in the same order across tiers.
- Prices are numbers with the period: "£24 per seat a month". Say what annual billing saves in money or months.

## FAQ

Real objections, asked the way buyers ask them: price changes, data location, switching cost, security, cancelling, refunds. Answers start with "Yes." or "No." when the question allows it.

## Testimonials and proof

Only real quotes you may use: name, role, company, and a concrete result ("We closed the books 3 days faster"). Without them, use a fact strip people can check (customers, uptime, years running) or leave the section out. Never invent people or logos.

## Numbers, dates and names

- Tabular figures in tables, KPIs and prices. Thousands separators. Units next to numbers: "1.2 s", "£24.4k", "99.98%".
- Dates people read: "24 Nov 2026", "2 minutes ago", "Today, 09:12". Machine dates only in `datetime` attributes.
- Sample data looks real: varied names, uneven amounts (£1,240.00, £880.50), seasonality. `node scripts/sample-data.mjs` generates it.

## Words to cut

The lint catches hype words, clichés and generated tics (see `scripts/lib/copy-rules.mjs`). Also cut, by hand: "simply", "just", "easily", "very", "truly", "all-in-one", "solution", "platform for everything", and any sentence that starts with "Whether you".
