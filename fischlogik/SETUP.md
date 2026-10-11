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
