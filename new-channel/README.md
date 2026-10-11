# new-channel

Kênh mới, tách riêng khỏi các kênh khác. Video làm bằng code theo thư viện
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (canvas/WebGL render từng frame, TTS, nhạc tự viết, mux ffmpeg).

Trạng thái: **đang gom thông tin, chưa sản xuất**. Chờ video mẫu và lệnh bắt đầu.

## Cấu trúc dự kiến

```
new-channel/
  README.md        file này
  SETUP.md         cách cài và chạy thư viện trong container cloud
  BRIEF.md         style, ngôn ngữ, giọng, độ dài, khung hình (điền sau khi có video mẫu)
  template/        code dùng chung cho mọi tập (một lần viết, tái sử dụng)
  episodes/<slug>/ mỗi tập: script, timeline, TREATMENT.md, build.sh, output
```

## Quy trình rút gọn (tiết kiệm usage)

1. Tập đầu: chọn 1 style, viết `template/` (engine vẽ, nhạc nền, mix, subtitle). Tốn nhất.
2. Từ tập 2: chỉ đổi script + timeline + vài cảnh. Không đọc lại guide, không mở demo.
3. Bỏ storyboard. Kiểm tra bằng 1 contact sheet (frame mỗi 2 s), sửa 1 vòng, render.
4. Chỉ đọc đúng file kỹ thuật cần trong demo của style, không đọc cả demo.
