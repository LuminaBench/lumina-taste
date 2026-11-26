// Kit markup → JSX, for the Next.js page the installer writes. The kit's HTML is regular (its React
// wrappers render the same markup), so a careful attribute and tag rewrite is enough: class → className,
// SVG and form attributes to their React names, style strings to objects, void tags closed, comments
// as JSX comments. Pure function, no I/O.

const RENAME = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength',
  colspan: 'colSpan', rowspan: 'rowSpan', datetime: 'dateTime', autocomplete: 'autoComplete', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint',
  srcset: 'srcSet', crossorigin: 'crossOrigin', novalidate: 'noValidate', autofocus: 'autoFocus', playsinline: 'playsInline', contenteditable: 'contentEditable',
  spellcheck: 'spellCheck', accesskey: 'accessKey', referrerpolicy: 'referrerPolicy', fetchpriority: 'fetchPriority', popovertarget: 'popoverTarget',
  popovertargetaction: 'popoverTargetAction', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', 'xmlns:xlink': 'xmlnsXlink', checked: 'defaultChecked',
};
/** Attributes React types as numbers. */
const NUMERIC = new Set(['colSpan', 'rowSpan', 'tabIndex', 'maxLength', 'minLength', 'size', 'rows', 'cols', 'span', 'start']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function styleObject(css) {
  const parts = css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':');
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
    return `${k.startsWith('--') ? JSON.stringify(k) : camel(k)}: ${JSON.stringify(v)}`;
  });
  // Custom properties are not in React's CSSProperties type: say what the object is.
  return /"--/.test(parts.join('')) ? `{{ ${parts.join(', ')} } as import('react').CSSProperties}` : `{{ ${parts.join(', ')} }}`;
}

function attrs(src, tag) {
  const out = [];
  const re = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const value = m[3] ?? m[4] ?? m[5];
    let key = RENAME[name] ?? (/^(data-|aria-)/.test(name) ? name : name.includes('-') || name.includes(':') ? camel(name.replace(':', '-')) : name);
    if (name === 'value' && ['input', 'textarea'].includes(tag)) key = 'defaultValue';
    if (name === 'selected' && tag === 'option') continue;
    if (value === undefined) { out.push(key); continue; }
    if (name === 'style') { out.push(`style=${styleObject(value)}`); continue; }
    if (NUMERIC.has(key) && /^-?\d+$/.test(value)) { out.push(`${key}={${value}}`); continue; }
    out.push(`${key}=${JSON.stringify(value.replace(/&quot;/g, '"').replace(/&amp;/g, '&'))}`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

/** One HTML fragment as JSX. Text that has braces in it is escaped; <script> elements are dropped. */
export function htmlToJsx(html) {
  let s = String(html).replace(/<script\b[\s\S]*?<\/script>/gi, '');
  // Braces in text are not expressions (done before comments become {/* … */}).
  s = s.replace(/>([^<]*)</g, (m, text) => `>${text.replace(/[{}]/g, (c) => (c === '{' ? "{'{'}" : "{'}'}"))}<`);
  s = s.replace(/<!--([\s\S]*?)-->/g, (_, c) => `{/*${c.replace(/\*\//g, '* /')}*/}`);
  s = s.replace(/<([a-zA-Z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g, (m, tag, a, self) => {
    const t = tag.toLowerCase();
    const close = self || VOID.has(t) ? ' />' : '>';
    return `<${tag}${attrs(a, t)}${close}`;
  });
  // Void elements written with a closing tag in the source never are, but be safe.
  s = s.replace(new RegExp(`</(${[...VOID].join('|')})>`, 'gi'), '');
  return s;
}
