# Setup (container cloud)

Thư viện clone ngoài repo này: `/home/user/lemomo-ai/lemo-opuscar` (gọi là `$LIB`). Không commit nó vào đây.

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar /home/user/lemomo-ai/lemo-opuscar
cd /home/user/lemomo-ai/lemo-opuscar
npm install --no-audit --no-fund --loglevel=error
uv venv --quiet --python 3.12 .venv
uv pip install --quiet --python .venv/bin/python -r requirements.txt
# cdn.playwright.dev bị chặn: dùng Chromium có sẵn trong container
export PLAYWRIGHT_CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

Đã kiểm tra (2026-10-11): Node 22, ffmpeg 6.1, Python 3.12 venv, 4 CPU, 15 GB RAM, không GPU.
Render thử 24 frame 1080p: OK (~5 s).

## Giới hạn mạng hiện tại

Bị chặn bởi network policy của environment:

| Host | Dùng cho | Hậu quả |
|---|---|---|
| `huggingface.co` | model Kokoro (TTS tiếng Anh), Whisper (kiểm tra giọng) | không có TTS offline, không check giọng |
| `speech.platform.bing.com` | edge-tts (giọng Microsoft, có tiếng Việt) | không có TTS online |
| `github.com/.../releases` | thư viện nhạc cụ sample, HDRI | chỉ dùng nhạc tổng hợp bằng numpy |
| `cdn.playwright.dev` | browser render | đã thay bằng Chromium có sẵn |

Mở thêm host ở: menu environment trên thanh tiêu đề session > Edit > Network access > Allowed domains.
Hướng dẫn: https://code.claude.com/docs/en/cloud-environments#network-access

Không có GPU: style 3D (brick-toy, paper-popup, glass-product...) render chậm qua SwiftShader. Ưu tiên style 2D.

## Sản xuất một tập (đã chạy cho Folge 1)

```sh
pip: uv pip install --python $LIB/.venv/bin/python faster-whisper edge-tts
# 1. voice + script -> word timings
ffmpeg -i voice/voice.mp3 -ac 1 -ar 16000 voice/v16.wav   # rồi chạy Whisper small (de), xem ep01/voice/
python3 voice/align.py voice/script.txt voice/whisper_words.json voice/words.json
# 2. render + mix + mux (khoảng 45 phút cho 66 s ở 720x1280, 4 CPU)
sh epNN/build.sh
# render lại một đoạn: --q 'off=<giây bắt đầu>&dur=<độ dài>' rồi ghép bằng ffmpeg trim/concat
```
Lưu ý: `core/render/mux.sh` lỗi với ffmpeg 6.1 ở container này, dùng `engine/mux.sh`.
Object động (InstancedMesh/Points đổi vị trí) phải đặt `frustumCulled = false`.
