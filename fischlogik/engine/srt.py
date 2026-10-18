# words.json -> delivery SRT (script spelling, cues <= ~44 chars, break at punctuation).
# Usage: python engine/srt.py epNN fischlogik-folge-NN.srt   (then fix spoken numbers by hand, e.g. siebenhundert -> 700)
import sys, json
ep = sys.argv[1].rstrip('/'); w = json.load(open(ep + '/voice/words.json')); cues, cur = [], []
for i, x in enumerate(w):
    cur.append(x); txt = ' '.join(y['w'] for y in cur); nxt = w[i + 1]['w'] if i + 1 < len(w) else ''
    if x['w'][-1] in '.!?' or (x['w'][-1] in ',:;' and len(txt) > 20) or len(txt + ' ' + nxt) > 44 or i == len(w) - 1:
        cues.append((cur[0]['t0'], cur[-1]['t1'], txt)); cur = []
f = lambda t: '%02d:%02d:%02d,%03d' % (t // 3600, t % 3600 // 60, int(t % 60), round(t * 1000) % 1000)
out = []
for j, (a, b, txt) in enumerate(cues):
    if j + 1 < len(cues): b = min(max(b, a + .6), cues[j + 1][0] - .02)
    out.append(f'{j + 1}\n{f(a)} --> {f(b)}\n{txt}\n')
open(ep + '/' + sys.argv[2], 'w').write('\n'.join(out)); print('cues', len(cues))
