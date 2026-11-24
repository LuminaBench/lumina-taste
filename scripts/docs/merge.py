"""Merge per-family documentation (scripts/docs/<family>.py → DOCS dict) into components/ui/<family>/family.json.
Run: python3 scripts/docs/merge.py <family> [...]  (dev-time authoring helper)."""
import json, sys, importlib.util, os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
for fam in sys.argv[1:]:
    spec = importlib.util.spec_from_file_location(fam, os.path.join(root, 'scripts/docs', f'{fam}.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    p = os.path.join(root, 'components/ui', fam, 'family.json')
    data = json.load(open(p))
    ids = {c['id'] for c in data['components']}
    for c in data['components']:
        d = mod.DOCS.get(c['id'])
        if d: c.update(d)
    missing = ids - set(mod.DOCS)
    open(p, 'w').write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(f'{fam}: merged {len(ids) - len(missing)}/{len(ids)}' + (f' (missing: {", ".join(sorted(missing))})' if missing else ''))
