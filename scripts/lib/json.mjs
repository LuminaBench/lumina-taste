// Readable but compact JSON: nested values stay on one line when they fit, so generated files are
// about half the size of JSON.stringify(v, null, 2) and still diff and read line by line.
export function formatJson(value, width = 110) {
  const walk = (v, indent) => {
    const flat = JSON.stringify(v);
    if (v === null || typeof v !== 'object' || flat.length + indent.length <= width) return flat;
    const inner = indent + '  ';
    if (Array.isArray(v)) return `[\n${v.map((x) => inner + walk(x, inner)).join(',\n')}\n${indent}]`;
    const entries = Object.entries(v).filter(([, x]) => x !== undefined);
    return `{\n${entries.map(([k, x]) => `${inner}${JSON.stringify(k)}: ${walk(x, inner)}`).join(',\n')}\n${indent}}`;
  };
  return walk(value, '') + '\n';
}
