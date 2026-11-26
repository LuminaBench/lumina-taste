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
/** Attributes React types as numbers (the ARIA ones too: aria-valuenow="40" is a type error in a .tsx page). */
const NUMERIC = new Set(['colSpan', 'rowSpan', 'tabIndex', 'maxLength', 'minLength', 'size', 'rows', 'cols', 'span', 'start',
  'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-level', 'aria-posinset', 'aria-setsize', 'aria-rowcount', 'aria-colcount', 'aria-rowindex', 'aria-colindex', 'aria-rowspan', 'aria-colspan']);
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
    if (name === 'value' && ['input', 'textarea', 'select'].includes(tag)) key = 'defaultValue';
    if (name === 'selected' && tag === 'option') continue;
    if (value === undefined) { out.push(key); continue; }
    if (name === 'style') { out.push(`style=${styleObject(value)}`); continue; }
    if (NUMERIC.has(key) && /^-?\d+(\.\d+)?$/.test(value)) { out.push(`${key}={${value}}`); continue; }
    out.push(`${key}=${JSON.stringify(value.replace(/&quot;/g, '"').replace(/&amp;/g, '&'))}`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (t) => t.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m));

/** One HTML fragment as JSX. Text that has braces in it is escaped; <script> elements are dropped. */
export function htmlToJsx(html) {
  let s = String(html).replace(/<script\b[\s\S]*?<\/script>/gi, '');
  // React picks a select's option from the select's defaultValue and ignores `selected` on the option: carry the
  // chosen option over, or the page opens on the first one (a booking bar showing 09:00 instead of 10:00).
  s = s.replace(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi, (m, a, body) => {
    const opt = /<option\b([^>]*?\sselected\b[^>]*)>([\s\S]*?)<\/option>/i.exec(body);
    if (!opt || /\s(value|multiple)\b/i.test(a)) return m;
    const value = /\svalue\s*=\s*"([^"]*)"/i.exec(opt[1])?.[1] ?? opt[2].replace(/<[^>]+>/g, '').trim();
    return `<select${a} value="${value.replace(/"/g, '&quot;')}">${body}</select>`;
  });
  // Comments are set aside first, so the text pass below never touches their "-->".
  const comments = [];
  s = s.replace(/<!--([\s\S]*?)-->/g, (_, c) => `\u0000${comments.push(c) - 1}\u0000`);
  // A < that opens no tag (SQL's "a < b") is fine in HTML text and a syntax error in JSX.
  s = s.replace(/<(?=[\s=\d])/g, '&lt;');
  // JSX trims and joins lines of text, so a code block would lose its line breaks and indentation: text inside
  // <pre> becomes string expressions that keep every space and newline.
  const strings = [];
  s = s.replace(/<pre\b[\s\S]*?<\/pre>/gi, (block) => block.replace(/>([^<]+)</g, (m, text) => `>\u0001${strings.push(JSON.stringify(decodeEntities(text))) - 1}\u0001<`));
  // Braces in text are not expressions, and a bare > in text (SQL's >=, an arrow) is a JSX syntax error.
  s = s.replace(/>([^<]*)</g, (m, text) => `>${text.replace(/[{}>]/g, (c) => (c === '{' ? "{'{'}" : c === '}' ? "{'}'}" : '&gt;'))}<`);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `{/*${comments[+i].replace(/\*\//g, '* /')}*/}`);
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => `{${strings[+i]}}`);
  s = s.replace(/<([a-zA-Z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g, (m, tag, a, self) => {
    const t = tag.toLowerCase();
    const close = self || VOID.has(t) ? ' />' : '>';
    return `<${tag}${attrs(a, t)}${close}`;
  });
  // Void elements written with a closing tag in the source never are, but be safe.
  s = s.replace(new RegExp(`</(${[...VOID].join('|')})>`, 'gi'), '');
  return s;
}
