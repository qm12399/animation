# Fischlogik

Kênh TikTok tiếng Đức về mẹo câu cá, tách riêng khỏi các kênh khác. Video làm bằng code theo thư viện
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (canvas/WebGL render từng frame, TTS, nhạc tự viết, mux ffmpeg).

Trạng thái: đang sản xuất, đã xong Folge 1-7 (`ep01`-`ep07`). Quy trình và luật: `../CLAUDE.md`.

## Cấu trúc

```
fischlogik/
  STYLEGUIDE.md  chuẩn visual (bắt buộc)
  BRIEF.md       khung hình, độ dài, đồ giao mỗi tập
  SETUP.md       cài đặt (cloud và local), lệnh sản xuất
  REFERENCE.md   phân tích kịch bản video mẫu
  brand/         logo
  engine/        code dùng chung: cảnh 3D, cá, mồi, UI, mix, mux
  epNN/          mỗi tập: index.html, TREATMENT.md, voice/, build.sh, mp4, srt, poster
```

## Quy trình rút gọn (tiết kiệm usage)

1. Tập đầu: chọn 1 style, viết `template/` (engine vẽ, nhạc nền, mix, subtitle). Tốn nhất.
2. Từ tập 2: chỉ đổi script + timeline + vài cảnh. Không đọc lại guide, không mở demo.
3. Bỏ storyboard. Kiểm tra bằng 1 contact sheet (frame mỗi 2 s), sửa 1 vòng, render.
4. Chỉ đọc đúng file kỹ thuật cần trong demo của style, không đọc cả demo.
