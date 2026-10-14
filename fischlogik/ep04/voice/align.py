# Align script tokens (ground truth text) to Whisper word timings -> words.json
import json, re, sys, difflib
script = open(sys.argv[1]).read().split()
W = json.load(open(sys.argv[2]))
norm = lambda s: re.sub(r'[^\wäöüß]', '', s.lower())
a, b = [norm(t) for t in script], [norm(w['w']) for w in W]
out = [None] * len(script)
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal':
        for k in range(i2 - i1): out[i1 + k] = (W[j1 + k]['t0'], W[j1 + k]['t1'])
    elif j2 > j1:   # replace: spread the whisper span over the script tokens
        t0, t1 = W[j1]['t0'], W[j2 - 1]['t1']; n = i2 - i1
        for k in range(n): out[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
        print('fuzzy:', script[i1:i2], '<-', [w['w'] for w in W[j1:j2]])
for i, o in enumerate(out):   # any token left: squeeze between neighbours
    if o is None:
        p = out[i - 1][1] if i else 0; n = next(x for x in out[i + 1:] if x)[0]; out[i] = (p, n); print('gap:', script[i])
json.dump([{'w': t, 't0': round(o[0], 3), 't1': round(o[1], 3)} for t, o in zip(script, out)], open(sys.argv[3], 'w'), ensure_ascii=False, indent=0)
print('tokens', len(script), 'end', out[-1][1])
