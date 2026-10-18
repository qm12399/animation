# Repo: animation

Chỉ có một dự án: **Fischlogik** (`fischlogik/`), kênh TikTok tiếng Đức về mẹo câu cá, video 3D giải thích làm bằng code với thư viện [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar).

Người dùng viết tiếng Việt, trả lời bằng tiếng Việt. Lời thoại, phụ đề, chữ trên hình và caption TikTok bằng tiếng Đức.

## Đọc trước khi làm một tập (theo thứ tự)

1. `fischlogik/STYLEGUIDE.md`: chuẩn visual bắt buộc (màu, font, phụ đề, hook §5, thẻ tiêu đề §5b, âm thanh).
2. `fischlogik/BRIEF.md`: khung hình, độ dài, những thứ phải giao.
3. `fischlogik/SETUP.md`: cài đặt, lệnh sản xuất, các lỗi đã gặp.
4. Tập gần nhất (`fischlogik/ep07/`): `index.html` là mẫu để copy, đọc `TREATMENT.md` để thấy cách chia cảnh.

Không cần đọc lại toàn bộ engine. Chỉ mở file engine liên quan đến cảnh đang dựng (danh sách ở dưới).

## Mỗi tập: đầu vào và đầu ra

Đầu vào người dùng gửi: voice MP3 (tiếng Đức), SRT tự động ("đáng tin nhưng không tuyệt đối"), script text.

Đầu ra trong `fischlogik/epNN/`:
- `fischlogik-folge-NN.mp4` (720x1280, 30 fps, 45-60 s, tối đa 120 s, -14 LUFS)
- `fischlogik-folge-NN.srt` (theo chính tả của script, số viết bằng chữ số: "700", "7x7")
- `poster.jpg` (khung có thẻ tiêu đề, khoảng giây 5.5)
- `TREATMENT.md`, `CREDITS`, `TIKTOK.txt`, `audio.json`, `build.sh`, `index.html`, `voice/`

Trong chat gửi: bản mp4 nén dưới 30 MB (`ffmpeg -crf 23`), file SRT, rồi caption TikTok:
1 câu tiếng Đức ngắn + 5 hashtag: 3 cố định `#fischlogik #angeln #angelntipps` + 2 theo chủ đề.

## Luật đã chốt từ phản hồi của người dùng (không được quên)

- **Tiết kiệm usage.** Không đọc thừa, không render thừa.
- **Hook:** khung đầu tiên cho thấy đúng thứ câu nói đầu tiên nhắc tới. Bắt đầu cận rồi kéo ra, có chuyển động ngay từ frame 0. (Folge 1 mở bằng cảnh tung cần khi lời nói về tung cần: hiệu quả tốt. Folge 2 lẽ ra nên mở bằng con cá dưới nước rồi zoom ra cây cầu.)
- **Thẻ tiêu đề bắt buộc mỗi tập:** kicker `FISCHLOGIK · FOLGE N` + tiêu đề serif nghiêng 2 dòng, một từ màu vàng. Hiện trong khoảng 4-7 s, ít nhất 2.5 s, đè lên cảnh đang chuyển động. (Folge 3 thiếu.)
- **Phụ đề ở giữa, gọn:** tối đa 3 từ và khoảng 20 ký tự mỗi cụm, rộng tối đa 72 % khung (`UI.setWords(words, keys, 3, 20)`).
- Note của người dùng là cho các tập sau. Không làm lại tập cũ trừ khi được yêu cầu.
- Văn phong khi trả lời: rõ, thẳng, câu dài ngắn xen kẽ, không dùng dấu " — ", không sáo rỗng.

## Quy trình một tập

```sh
EP=fischlogik/ep08            # copy cấu trúc từ ep07
# 1. voice -> thời gian từng từ
ffmpeg -i $EP/voice/voice.mp3 -ac 1 -ar 16000 $EP/voice/v16.wav
$PY fischlogik/engine/transcribe.py $EP                       # -> voice/whisper_words.json
$PY $EP/voice/align.py $EP/voice/script.txt $EP/voice/whisper_words.json $EP/voice/words.json
# 2. viết TREATMENT.md (hook, thẻ tiêu đề, bảng cảnh theo thời gian lời nói), rồi index.html
# 3. QA bằng ảnh tĩnh TRƯỚC khi render full (rẻ, khoảng 3 s/ảnh)
cd $LIB && node core/render/still.mjs <đường dẫn tuyệt đối tới EP> 0.5 2.4 5.5 ... --size 720x1280
python core/render/sheet.py /tmp/sheet.jpg <EP>/stills/t_*.jpg --cols 5 --w 300   # xem sheet, sửa khung hình
# 4. render + mix + mux
sh $EP/build.sh               # env: LIB, PY, WORKERS, PLAYWRIGHT_CHROME (tuỳ chọn), SKIP_VIDEO=1 để chỉ mix lại
# 5. kiểm tra: blackdetect, contact sheet mỗi 2 s
ffmpeg -i $EP/fischlogik-folge-NN.mp4 -vf "fps=0.5,scale=240:-1,tile=8x4" -frames:v 1 /tmp/c.jpg
# 6. SRT, poster, bản nén, commit + push
$PY fischlogik/engine/srt.py $EP fischlogik-folge-NN.srt
```

Sửa một đoạn hỏng mà không render lại cả tập: mở trang với query `?off=<giây bắt đầu>&dur=<độ dài>` (video.mjs nhận `--q 'off=..&dur=..'`), rồi ghép bằng ffmpeg trim/concat (frame = giây × 30).

## Engine (`fischlogik/engine/`, mỗi tập symlink `engine -> ../engine`)

| File | Nội dung |
|---|---|
| `core.js` | renderer, `draw(scene, cam, {focus, aper, bloom, vig, sat, fade})`, hàm toán (seg, ss, eio, eo, keys, rng, V3), texture, `toScreen` |
| `ui.js` | overlay 2D: karaoke, pill, callout, title, endCard, chapter, scoreCard, bigStat, arrow, swirl, grab/overlaySnap (dissolve) |
| `lake.js` | hồ nhìn từ trên + ngang mặt nước, `shore()`, `PLACES` |
| `under.js` | cảnh dưới nước, mode shallow/open/weeds/clear/deep/murky/night |
| `section.js` | mặt cắt hồ (phân tầng nhiệt), mặt cắt bờ |
| `river.js` | sông, trụ cầu, đá, kè |
| `angler.js` | người câu cá với các pose (tung cần, đi bộ...) |
| `fish.js` | barsch, hecht, rotauge, forelle, ukelei, zander; `makeFish`, `makeSchool` |
| `lures.js` | 12 loại mồi, `makeLure(kind, scale, opts)` |
| `pikejaw.js` | đầu cá chó cận cảnh có hàm mở + răng; `makeLeader` (fluoro/thick/steel) |
| `bird.js` | mòng biển |
| `mix.py` | nhạc + ambience + sfx từ `events.json` và `audio.json`; sfx: swish plop dive whoosh cut thud dart gust tick ding gull swirl chug buzz ching reel strike snap saw |
| `mux.sh` | ghép video + mix, loudnorm 2 lượt về -14 LUFS (dùng file này, không dùng core/render/mux.sh) |
| `transcribe.py`, `srt.py` | Whisper small (de) → whisper_words.json; words.json → SRT giao kèm |

## Bẫy đã gặp

- Object động (InstancedMesh, Points, mesh đổi geometry mỗi frame) phải `frustumCulled = false`, nếu không sẽ biến mất trong video dù ảnh tĩnh vẫn thấy.
- Đặt `frustumCulled` sau khi khai báo biến (lỗi "Cannot access before initialization").
- Camera dưới nước, khoảng cách 3 m: bề ngang nhìn thấy chỉ khoảng ±0.65 m. Vật đặt xa hơn sẽ ra khỏi khung, kiểm tra bằng ảnh tĩnh.
- Mồi (twitchbait) có mũi hướng +x, thân kéo về -x: nhắm camera vào giữa thân, đừng nhắm vào mũi.
- Hàm cá chó nhìn chính diện thành một khối đỏ: dùng góc nghiêng.
- Glow/point của một cảnh phải tắt `visible` ở các cảnh khác.
- Gửi file trên 30 MB qua chat bị lỗi: gửi bản nén.

## Git

Nhánh đang làm: `claude/magical-thompson-j7fky1`. Commit và push sau mỗi tập. `out/` và `stills/` đã bị gitignore.
