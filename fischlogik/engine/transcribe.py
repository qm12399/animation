# Voice -> Whisper word timings (German). Usage: python engine/transcribe.py epNN
# Writes epNN/voice/whisper_words.json; then run: python epNN/voice/align.py script.txt whisper_words.json words.json
import sys, json, soundfile as sf
from faster_whisper import WhisperModel
v = sys.argv[1].rstrip('/') + '/voice/'
audio, sr = sf.read(v + 'v16.wav', dtype='float32')   # ffmpeg -i voice.mp3 -ac 1 -ar 16000 v16.wav
assert sr == 16000
segs, _ = WhisperModel('small', device='cpu', compute_type='int8').transcribe(audio, language='de', word_timestamps=True)
out = [{'w': w.word.strip(), 't0': round(w.start, 3), 't1': round(w.end, 3)} for s in segs for w in s.words]
json.dump(out, open(v + 'whisper_words.json', 'w'), ensure_ascii=False)
print('words', len(out), 'end', out[-1]['t1'])
