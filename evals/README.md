# Evals

How well does an agent build pages with this skill? These files measure it.

- `evals.json`: 30 briefs across 19 page types and a dozen domains, in the skill-creator format plus `slug`, `pageType` and machine `checks`.
- `fixtures/plain-landing.html`: a typical generated landing page (purple gradient, emoji icons, three equal buttons) for the "restyle an existing page" brief.
- `reference-scores.json`: the blueprints scored as reference answers.

## Score one page

```sh
node scripts/eval-score.mjs path/to/output --brief saas-landing-invoicing
```

Score out of 100:

| Part | Weight | From |
| --- | --- | --- |
| Audit | 35% | `audit-ui.mjs` errors at 390px and 1440px, light and dark (10 points each) |
| Taste | 35% | `audit-ui.mjs --taste` score |
| Brief checks | 20% | The brief's `checks`: one h1, landmarks, the sections it asked for |
| Hygiene | 10% | Copy lint hits and raw colours in the output's own CSS |

`--quick` runs desktop and light only. `--json out.json` saves the result; `--baseline old.json` prints the change per brief.

## Run an agent over the briefs

```sh
node scripts/eval-run.mjs --agent 'claude -p {prompt} --permission-mode acceptEdits' --only saas-landing-invoicing,analytics-dashboard
```

Each brief gets a fresh folder under `evals/runs/` (git-ignored); the command runs inside it with `{prompt}` replaced by the brief. The run is scored at the end and saved as `scores.json`. Compare two runs with `--baseline`.

## Targets

- Every brief: 0 audit errors on the first finished attempt.
- Mean score 90 or more; taste 90 or more on at least 90% of briefs.
- A change to `SKILL.md`, `compose.mjs` or the references ships only if the mean does not drop.
