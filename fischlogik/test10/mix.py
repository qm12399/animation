# voice + original score + foley -> out/mix.wav
import json, os, subprocess, sys
import numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, f'{LIB}/core/audio')
from sfx import SR, whoosh, pop, thump, ding, click, lp, hp, compress, limit, add, noise, env_exp, t_
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(f'{HERE}/events.json')); DUR = ev['dur']
N = int(DUR * SR) + SR
LINE_AT = [0.2, 3.3, 6.0]

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)

# ---- voice
vm = np.zeros(N)
for i, at in enumerate(LINE_AT):
    x = load(f'{HERE}/voice/l{i}.mp3'); s0 = int(at * SR); vm[s0:s0 + len(x)] += x[:N - s0]
vm = compress(vm, thr=.2, ratio=3)
voice = np.stack([vm, vm], 1)

# ---- score: D major, 100 bpm, soft plucks + warm pad + low pulse
bpm = 100; beat = 60 / bpm
def pluck(f, d=1.2, v=.3):
    tt = t_(d); x = sum(np.sin(2 * np.pi * f * k * tt) / k ** 1.6 for k in (1, 2, 3, 4)) * np.exp(-tt * 4.5)
    return x * v * np.minimum(1, tt / .004)
def pad(fs, d, v=.08):
    tt = t_(d); x = sum(np.sin(2 * np.pi * f * tt + np.sin(2 * np.pi * .3 * tt)) + .3 * np.sin(4 * np.pi * f * tt) for f in fs)
    e = np.minimum(1, tt / .6) * np.minimum(1, (d - tt) / .8); return lp(x * e * v, 1800)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[62, 66, 69, 74], [59, 62, 66, 71], [55, 59, 62, 67], [57, 61, 64, 69]]   # D Bm G A
music = np.zeros((N, 2)); bar = 4 * beat; t = 0.0; b = 0
while t < DUR:
    ch = chords[b % 4]
    add(music, pad([mid(m - 12) for m in ch[:3]], bar + .5), t, .9)
    for i in range(8):
        add(music, pluck(mid(ch[[0, 2, 1, 3, 2, 1, 3, 2][i]] + 12), v=.12), t + i * beat / 2, 1, pan=(-.3 if i % 2 else .3))
    add(music, lp(np.sin(2 * np.pi * mid(ch[0] - 24) * t_(beat * 1.6)) * np.exp(-t_(beat * 1.6) * 3), 300) * .35, t, 1)
    add(music, lp(np.sin(2 * np.pi * mid(ch[0] - 24) * t_(beat * 1.6)) * np.exp(-t_(beat * 1.6) * 3), 300) * .25, t + 2 * beat, 1)
    t += bar; b += 1
# duck music under voice
vl = np.abs(voice).mean(1); k = int(.05 * SR); env = np.convolve(vl, np.ones(k) / k, 'same')
duck = 1 - .55 * np.clip(env / (env.max() * .25), 0, 1)
music *= duck[:, None]
music[int((DUR - 1.2) * SR):] *= np.linspace(1, 0, N - int((DUR - 1.2) * SR))[:, None]

# ---- foley
fx = np.zeros((N, 2))
amb = lp(hp(noise(DUR + 1), 300), 2500) * .012; add(fx, amb, 0, 1)
for e in ev['ev']:
    if e['type'] == 'whoosh': add(fx, whoosh(.45, .5), e['t'], .5)
    if e['type'] == 'cast': add(fx, whoosh(.3, .35), e['t'], .35, pan=.3)
    if e['type'] == 'plop': add(fx, pop(.6), e['t'], .5); add(fx, thump(.4, 110), e['t'], .4)
    if e['type'] == 'ding': add(fx, ding(.4), e['t'], .35)

mix = voice * 1.0 + music * .5 + fx
mix = np.stack([limit(mix[:, 0] * .8), limit(mix[:, 1] * .8)], 1)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/mix.wav', mix[:int(DUR * SR)], SR)
print('mix ok', DUR)
