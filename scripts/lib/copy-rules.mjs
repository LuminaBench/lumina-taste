// Words and phrases that make interface copy sound generated. Shared by lint-copy.mjs and audit-ui.mjs.
// Each rule: a pattern, what is wrong, and what to write instead. Matching is case-insensitive.
export const COPY_RULES = [
  [/\bunlock(s|ing)? (the|your|new)\b/i, 'Hype verb', 'Say what it does: "Export any report to CSV."'],
  [/\bsupercharg(e|es|ed|ing)\b/i, 'Hype verb', 'Name the actual speed-up: "Queries return in under 200 ms."'],
  [/\bseamless(ly)?\b/i, 'Empty adjective', 'Describe the step that disappeared: "Sign in once for every workspace."'],
  [/\beffortless(ly)?\b/i, 'Empty adjective', 'Say how many steps or how long.'],
  [/\belevate(s|d)? (your|the)\b/i, 'Hype verb', 'Say what gets better and by how much.'],
  [/\bempower(s|ing)?\b/i, 'Hype verb', 'Say what people can now do.'],
  [/\brevolutioni[sz](e|es|ing)\b/i, 'Hype verb', 'Describe the change plainly.'],
  [/\bgame[- ]chang(er|ing)\b/i, 'Cliché', 'Give the fact that makes it matter.'],
  [/\bcutting[- ]edge\b/i, 'Cliché', 'Name the technique or drop it.'],
  [/\bnext[- ]generation\b|\bnext[- ]gen\b/i, 'Cliché', 'Say what is new about it.'],
  [/\bworld[- ]class\b/i, 'Cliché', 'Use a number or a name instead.'],
  [/\bstate[- ]of[- ]the[- ]art\b/i, 'Cliché', 'Use a number or drop it.'],
  [/\bbest[- ]in[- ]class\b/i, 'Cliché', 'Use a comparison people can check.'],
  [/\bleverag(e|es|ing)\b/i, 'Jargon', 'Use "use".'],
  [/\bharness(es|ing)? the (power|potential)\b/i, 'Cliché', 'Say what it does.'],
  [/\bunleash(es|ing)?\b/i, 'Hype verb', 'Say what it does.'],
  [/\bdelv(e|es|ing) into\b/i, 'Generated tic', 'Use "look at" or just start.'],
  [/\bdive (deep )?into\b|\bdeep dive\b/i, 'Generated tic', 'Use "read", "see" or "explore".'],
  [/\b(take|takes|taking) (it|your \w+|things) to the next level\b/i, 'Cliché', 'Say what improves.'],
  [/\bin today'?s (fast[- ]paced|digital|ever[- ]changing)\b/i, 'Filler opener', 'Delete the sentence; start with the point.'],
  [/\bwhether you'?re an? .{1,40} or an? \b/i, 'Filler opener', 'Pick the reader and talk to them.'],
  [/\b(ever[- ]evolving|ever[- ]changing) landscape\b/i, 'Filler', 'Delete it.'],
  [/\brobust and scalable\b|\bscalable and robust\b/i, 'Filler pair', 'Say the limit you tested.'],
  [/\b(boost|skyrocket)(s|ed|ing)? (your )?productivity\b/i, 'Hype', 'Say which task gets faster.'],
  [/\btransform(s|ing)? the way (you|teams)\b/i, 'Hype', 'Describe the before and after.'],
  [/\bat your fingertips\b/i, 'Cliché', 'Say where it is: "in the top bar".'],
  [/\b(magic(al)?|magically)\b(?! link)/i, 'Vague', 'Explain what happens.'],
  [/\bstreamlin(e|ed|es|ing) your\b/i, 'Jargon', 'Say which steps go away.'],
  [/\b(a|the) testament to\b/i, 'Generated tic', 'Delete it.'],
  [/\bnavigat(e|ing) the complexit(y|ies)\b/i, 'Generated tic', 'Say the actual problem.'],
  [/\btapestry\b/i, 'Generated tic', 'Delete it.'],
  [/\bembark(s|ed|ing)? on\b/i, 'Generated tic', 'Use "start".'],
  [/\blook no further\b/i, 'Cliché', 'Delete it.'],
  [/\bfeel free to\b/i, 'Filler', 'Just say the action.'],
  [/!{1}(?=\s|$)/, 'Exclamation mark', 'Calm, specific sentences. Save "!" for real alarms, and even then prefer a status icon.'],
];

/** Find every rule hit in a string. Returns [{ index, match, why, fix }]. */
export function lintCopy(text) {
  const hits = [];
  for (const [re, why, fix] of COPY_RULES) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) hits.push({ index: m.index, match: m[0], why, fix });
  }
  return hits.sort((a, b) => a.index - b.index);
}
