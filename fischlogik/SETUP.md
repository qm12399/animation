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

## Chạy trên máy local (Mac / Linux / Windows qua WSL)

Cần: git, Node 20+, Python 3.12, ffmpeg, khoảng 5 GB trống. Windows: chạy mọi lệnh trong WSL (Ubuntu), vì `build.sh` là shell script.

```sh
# 1. repo dự án
git clone https://github.com/qm12399/animation.git && cd animation
git checkout claude/magical-thompson-j7fky1
# 2. thư viện, đặt cạnh repo (không commit vào repo)
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar ../lemo-opuscar
cd ../lemo-opuscar && npm install && npx playwright install chromium-headless-shell
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt faster-whisper
cd ../animation
# 3. biến môi trường (thêm vào ~/.zshrc hoặc ~/.bashrc)
export LIB=$(cd ../lemo-opuscar && pwd)
export PY=$LIB/.venv/bin/python
export WORKERS=4            # số tiến trình render; để bằng số nhân CPU trừ 2
# 4. thử: chỉ mix + mux lại Folge 7 từ video sẵn có (vài phút)
mkdir -p fischlogik/ep07/out && ffmpeg -i fischlogik/ep07/fischlogik-folge-07.mp4 -an -c copy fischlogik/ep07/out/video.mp4
SKIP_VIDEO=1 sh fischlogik/ep07/build.sh
```

Trên máy có GPU, render nhanh hơn container cloud nhiều (cloud: khoảng 60 phút một tập vì không có GPU).
Mac tự dùng Metal. Linux có GPU: thử `LEMO_ANGLE=gl` nếu log báo "software rendering".
Lần đầu chạy `transcribe.py` sẽ tải model Whisper `small` (khoảng 500 MB).
