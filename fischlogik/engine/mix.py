# Fischlogik mix: user voice + quiet original score (G major, soft plucks + pad) + foley from EV + ambience beds
import json, os, subprocess, sys
import numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, f'{LIB}/core/audio')
from sfx import SR, whoosh, pop, thump, ding, click, lp, hp, bp, compress, limit, add, noise, t_
EP = os.path.abspath(sys.argv[1])
ev = json.load(open(f'{EP}/events.json')); cfg = json.load(open(f'{EP}/audio.json'))
DUR = ev['dur']; N = int(DUR * SR) + SR
rng = np.random.default_rng(3)

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2)
def fade(n, a=.3, b=.3):
    e = np.ones(n); ia, ib = int(a * SR), int(b * SR); e[:ia] = np.linspace(0, 1, ia); e[n - ib:] = np.linspace(1, 0, ib); return e
def put(buf, x, at, gain=1.0, pan=0.0):
    if x.ndim == 1: add(buf, x, at, gain, pan)
    else:
        s = int(at * SR); n = min(len(x), len(buf) - s); buf[s:s + n] += x[:n] * gain

# ---- voice (as delivered, light compression)
v = load(f"{EP}/{cfg['voice']}")
vm = compress(v.mean(1), thr=.25, ratio=2.5); voice = np.zeros((N, 2)); put(voice, np.stack([vm, vm], 1), cfg['voice_at'])

# ---- score: G D Em C, 92 bpm
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def pluck(f, d=1.6, v=.25):
    tt = t_(d); x = sum(np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (3 + k * 1.5)) / k ** 1.4 for k in (1, 2, 3, 4, 5))
    return x * v * np.minimum(1, tt / .003)
def pad(fs, d, v=.06):
    tt = t_(d); x = sum(np.sin(2 * np.pi * f * tt + .3 * np.sin(2 * np.pi * .25 * tt)) + .25 * np.sin(4 * np.pi * f * tt * 1.002) for f in fs)
    return lp(x * np.minimum(1, tt / .8) * np.minimum(1, (d - tt) / 1.0) * v, 1500)
chords = [[55, 59, 62, 67], [50, 57, 62, 66], [52, 59, 64, 67], [48, 55, 60, 64]]
bpm = 92; beat = 60 / bpm; bar = 4 * beat; music = np.zeros((N, 2)); t = 0.0; b = 0
pat = [0, 2, 1, 3, 2, 1, 3, 2]
while t < cfg['music_end']:
    ch = chords[b % 4]
    put(music, pad([mid(m) for m in ch[:3]], bar + 1.2), t, 1)
    dens = 1 if 8.6 < t < 27.7 else 2
    for i in range(0, 8, dens): put(music, pluck(mid(ch[pat[i]] + 12), v=.09), t + i * beat / 2, 1, pan=(-.35 if i % 2 else .35))
    put(music, lp(np.sin(2 * np.pi * mid(ch[0] - 12) * t_(bar)) * np.exp(-t_(bar) * 1.2), 260) * .25, t, 1)
    t += bar; b += 1
tail = pad([mid(m) for m in chords[0][:3]], 4); put(music, tail, cfg['music_end'] - 4.2, 1.2)   # end on the tonic
# duck under the voice + designed silences
env = np.convolve(np.abs(voice.mean(1)), np.ones(int(.08 * SR)) / int(.08 * SR), 'same'); env /= env.max() + 1e-9
music *= (1 - .5 * np.clip(env * 5, 0, 1))[:, None]
for a, z in cfg['silence']:
    s, e = int(a * SR), int(z * SR); g = np.ones(N); g[s:e] = 0; g = np.convolve(g, np.ones(int(.15 * SR)) / int(.15 * SR), 'same'); music *= g[:, None]
music[int((DUR - 1.5) * SR):] *= np.linspace(1, 0, N - int((DUR - 1.5) * SR))[:, None]

# ---- ambience beds
def bed(kind, d):
    n = noise(d)
    if kind == 'birds':
        x = lp(hp(n, 400), 3000) * .01
        tt = t_(d)
        for _ in range(int(d * .9)):
            s = rng.uniform(0, d - .4); f0 = rng.uniform(2600, 4200); L = rng.uniform(.06, .18); k = np.arange(int(L * SR)) / SR
            ch = np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * rng.uniform(15, 30) * k)) * k) * np.sin(np.pi * k / L) ** 2 * rng.uniform(.01, .03)
            x[int(s * SR):int(s * SR) + len(ch)] += ch
        return x
    if kind == 'under': return lp(n, 220) * .09 + lp(hp(n, 900), 1600) * .006
    if kind == 'wind':
        sw = .5 + .5 * np.sin(2 * np.pi * .23 * t_(d) + 1) * np.sin(2 * np.pi * .11 * t_(d))
        return bp(n, 250, 1400) * .05 * (.4 + sw)
    if kind == 'night':
        x = lp(hp(n, 150), 900) * .008; tt = t_(d)
        for k0 in np.arange(0, d - .3, .9):
            k = np.arange(int(.25 * SR)) / SR; ch = np.sin(2 * np.pi * 4300 * k) * (np.sin(2 * np.pi * 40 * k) > 0) * np.sin(np.pi * k / .25) * .012
            i0 = int((k0 + rng.uniform(0, .3)) * SR); x[i0:i0 + len(ch)] += ch
        return x
    if kind == 'shop': return lp(hp(n, 200), 1500) * .012
    if kind == 'river': return bp(n, 200, 2600) * .07 * (1 + .25 * np.sin(2 * np.pi * .4 * t_(d))) + lp(n, 160) * .05
    if kind == 'creek': return (bp(n, 1200, 5000) * .03 * (1 + .4 * np.sin(2 * np.pi * 7 * t_(d)) * np.sin(2 * np.pi * 3.1 * t_(d))))
amb = np.zeros((N, 2))
for a, z, kind in cfg['env']:
    x = bed(kind, z - a)
    x = x * fade(len(x), .4, .4); put(amb, x, a, 1, pan=0)

# ---- foley from events
def bubbles(d=.8):
    x = np.zeros(int(d * SR))
    for _ in range(14):
        s = rng.uniform(0, d - .08); f = rng.uniform(500, 1400); k = np.arange(int(.06 * SR)) / SR
        b = np.sin(2 * np.pi * f * (1 + 4 * k) * k) * np.exp(-k * 60) * .25; x[int(s * SR):int(s * SR) + len(b)] += b
    return x
fx = np.zeros((N, 2))
for e in ev['ev']:
    k, at = e['type'], e['t']
    if k == 'swish': put(fx, hp(whoosh(.28, .6), 900), at, .45, .3)
    elif k == 'plop': put(fx, pop(.7), at, .5); put(fx, lp(thump(.5, 140), 600), at, .45)
    elif k == 'dive': put(fx, whoosh(.6, .7), at - .25, .4); put(fx, bubbles(), at, .5)
    elif k in ('whoosh', 'cut'): put(fx, whoosh(.45, .5), at - .2, .3)
    elif k == 'thud': put(fx, thump(1.0, 55), at, 1.0); put(fx, lp(noise(.25), 400) * np.exp(-t_(.25) * 18), at, .6)
    elif k == 'dart': put(fx, hp(whoosh(.25, .5), 1500), at, .35); put(fx, bubbles(.4), at, .4)
    elif k == 'gust': put(fx, bp(noise(1.6), 300, 1800) * np.sin(np.pi * t_(1.6) / 1.6) ** 2 * .3, at, 1)
    elif k == 'gull':
        tt = t_(.5); f = 1500 + 700 * np.exp(-tt * 9); put(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5) * (1 + .5 * np.sin(2 * np.pi * 30 * tt)) * .25, at, .5)
    elif k == 'swirl': put(fx, lp(noise(1.2), 500) * np.sin(np.pi * t_(1.2) / 1.2) ** 2 * .4, at, .6)
    elif k == 'chug':
        tt = t_(.35); x = np.sin(2 * np.pi * (180 + 300 * np.exp(-tt * 20)) * tt) * np.exp(-tt * 9) * .5 + bp(noise(.35), 600, 3000) * np.exp(-tt * 12) * .4
        put(fx, x, at, .7)
    elif k == 'buzz':
        d = e.get('d', 1.0); tt = t_(d); x = bp(np.sign(np.sin(2 * np.pi * 95 * tt)) * .3 + noise(d) * .1, 80, 900) * np.minimum(1, tt / .2) * np.minimum(1, (d - tt) / .3)
        put(fx, x, at, .18)
    elif k == 'ching':
        put(fx, click(1.2, .6), at, .4); put(fx, ding(.7), at + .06, .5); put(fx, ding(.5), at + .14, .35)
    elif k == 'tick': put(fx, click(1.4, .5), at, .3)
    elif k == 'ding': put(fx, ding(.5), at, .35)

def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
vr = rms(voice[voice.any(1)])
music *= (vr / rms(music[music.any(1)])) * 10 ** (-21 / 20)       # music ~21 dB under the voice
amb *= (vr / rms(amb[amb.any(1)])) * 10 ** (-27 / 20)
mix = voice + music + amb + fx * .9
mix = np.stack([limit(mix[:, 0] * .8), limit(mix[:, 1] * .8)], 1)
os.makedirs(f'{EP}/out', exist_ok=True); sf.write(f'{EP}/out/mix.wav', mix[:int(DUR * SR)], SR)
print('mix ok', DUR)
