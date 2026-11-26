# Evals

How well does an agent build pages with this skill? These files measure it.

- `evals.json`: 36 briefs across 27 page types and a dozen domains, in the skill-creator format plus `slug`, `pageType` and machine `checks`.
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
node scripts/eval-run.mjs --agent '<agent command with {prompt}>' --label <name> --only saas-landing-invoicing,analytics-dashboard
```

Each brief gets a fresh folder under `evals/runs/` (git-ignored); the command runs inside it with `{prompt}` replaced by the brief (shell-quoted) and `{dir}` by the folder. The run is scored at the end and saved as `scores.json`. Compare two runs with `--baseline`. Nothing runs without `--agent`: the scripts never pick an agent or spend credits on their own.

### Any agent with a command line

`eval-run.mjs` does not know or care which agent it drives. Anything that takes a prompt on the command line and edits files in the current folder works; give each agent its own `--label` so its runs stay apart in the history. The shapes below are examples, not real commands: use your tool's own flags for a one-shot, non-interactive run that may write files.

```sh
# prompt as an argument
node scripts/eval-run.mjs --agent 'agent-a-cli --non-interactive --allow-edits {prompt}' --label agent-a
# prompt on standard input
node scripts/eval-run.mjs --agent 'printf %s {prompt} | agent-b-cli exec --write' --label agent-b
# a wrapper script of your own, given the brief and the output folder
node scripts/eval-run.mjs --agent './my-runner.sh {prompt} {dir}' --label agent-c --timeout 1800
```

For a fair comparison run the same briefs (`--only` or `--limit`), the same skill commit and the same `--timeout`, with each agent's default model settings written down next to its label.

## History and trends

```sh
node scripts/eval-history.mjs                                   # trend per agent and per brief
node scripts/eval-history.mjs --add evals/runs/<run> --label agent-a   # record a run scored earlier
node scripts/eval-history.mjs --agent agent-a --brief pricing-dev-api  # one agent, one brief
```

`evals/history.json` keeps one row per brief per run: date, agent label, brief slug, score, sub-scores (audit, errors, taste, checks, hygiene) and the skill's git commit. `eval-run.mjs --label` appends automatically after scoring; scoring the same run again replaces its rows. The trend tables show each agent's mean per run with the change since its previous run, and each brief's latest score per agent. Commit `history.json` when a run should be kept as a reference.

## Targets

- Every brief: 0 audit errors on the first finished attempt.
- Mean score 90 or more; taste 90 or more on at least 90% of briefs.
- A change to `SKILL.md`, `compose.mjs` or the references ships only if the mean does not drop.
