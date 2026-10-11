# Fischlogik: style guide (chuẩn theo video mẫu)

Nguồn: video mẫu 720x1280, 30 fps, 112 s (phân tích khung 0.5 s, đo màu pixel, đo âm thanh).
Mọi số đo dưới đây tính trên khung 720x1280. Engine của kênh phải theo đúng file này.

## 1. Tổng thể

- 3D stylized "đồ chơi điện ảnh": hình khối đơn giản, nhưng ánh sáng mềm, sương nhẹ, có phản chiếu, bloom trên điểm sáng, xoá phông ở cận cảnh.
- Grade màu: hơi bạc, xanh lạnh ở vùng tối, đen không quá sâu (lifted blacks), tương phản thấp. Viền tối nhẹ (vignette) ở cảnh bản đồ.
- Camera **luôn chuyển động chậm** (push, crane, pan nhẹ). Không có khung đứng yên quá 1 s.
- Cảnh đổi mỗi 2-6 s. Rất ít hard cut (cả video chỉ ~15 cut). Phần lớn là chuyển cảnh liền mạch bằng camera (xem mục 4).

## 2. Bảng màu (đo từ video)

| Vai trò | Hex |
|---|---|
| Bầu trời (xám tím nhạt) | `#8a91a8` → `#9ca2b5` |
| Nước ao từ trên xuống, giữa (navy sâu) | `#10283c` |
| Nước ao, vùng giữa | `#243741` |
| Nước nhìn ngang (phản chiếu trời) | `#5e7c89` |
| Dưới nước, cảnh xanh rêu | `#175752` |
| Mặt cắt, lớp ấm | `#6a8873` |
| Mặt cắt, lớp lạnh | `#2c5b68` |
| Mặt cắt, đường ranh nhiệt | `#99aba7` (kem nhạt, phát sáng nhẹ) |
| Bùn đáy | `#252f35` |
| Cỏ (bản đồ) | `#494f32` → `#6d7a3a` (xanh ô liu, không chói) |
| Từ khoá / nhấn (vàng cam) | `#fbc464` |
| Pill callout (nền tối) | `#1b2a38`, alpha ~0.85 |
| Card cuối | gradient `#133f63` (trên) → `#0b2642` (dưới) + noise nhẹ |
| Chấm callout | cam `#f2a33a`, xanh `#6aa8e8`, đỏ `#e0524a` |

## 3. Chữ trên màn hình

**Phụ đề karaoke** (quan trọng nhất)
- Font: sans hình học rất đậm (gần Google Sans Bold). Dùng **Plus Jakarta Sans ExtraBold**.
- Cỡ ~42 px, căn giữa, tâm dòng ở **y = 0.665 H** (~850 px). Luôn 1 dòng, 1-5 từ / cụm, ngắt theo nhịp nói.
- Từ chưa đọc: trắng ~55 % alpha. Từ đang/đã đọc: trắng 100 %. Từ khoá: `#fbc464`.
- Bóng mờ mềm (blur ~12 px, đen 50 %), không viền.
- Cụm đổi ngay khi câu sang cụm mới, không fade dài.

**Callout pill**
- Nền tối `#1b2a38` ~85 %, bo tròn hết, chữ trắng 600 ~16 px, padding 10-12 px.
- Có biến thể chấm màu bên trái (vd "● Warm · 82°F") và biến thể icon "✕ not the middle".
- Đường dẫn: trắng mảnh 1.5 px, đầu neo là chấm màu 5 px (cam/xanh/đỏ). Pill nằm ngang hoặc ngay trên điểm neo.
- Xuất hiện: đường kẻ chạy ra 0.25 s, pill scale 0.8→1 có chút nảy, ở lại tới khi cảnh đổi.

**Pill chương**: nền tối, vòng tròn số (xanh nhạt `#9cc8f0` hoặc cam), tiêu đề in hoa 800 ~20 px, dòng phụ 11 px trắng 70 %. Đặt ở trên cùng (~y 135 px).

**Tiêu đề tập**: kicker in hoa giãn chữ (~12 px, letter-spacing 4 px) "FISCHLOGIK · FOLGE N"; tiêu đề serif đậm nghiêng 2 dòng (~56 px), 1 từ tô `#fbc464`. Dùng **Playfair Display Black Italic**. Xuất hiện **sau** hook (~5 s), không phải giây đầu.

**Card cuối**: kicker như trên; 2 dòng serif nghiêng tóm tắt (từ khoá vàng); logo cá trong khung góc (corner brackets); tên kênh serif thường; tagline in hoa giãn chữ "ANGELN MIT VERSTAND".

**Thước độ sâu** (mặt cắt): vạch trắng mảnh bên trái, nhãn "0 m / 1 m / 2,5 m / 4 m", số được nhắc tới tô vàng.

## 4. Ngữ pháp cảnh (các loại shot dùng lại)

| Mã | Shot | Ghi chú dựng |
|---|---|---|
| S1 | **Sau lưng người câu**, bờ có cỏ lau, mặt nước phản chiếu rừng | nhân vật lệch phải/dưới, cắt khung một phần; xoá phông cỏ gần |
| S2 | **Bản đồ ao từ trên xuống** | push-in chậm, vignette; cá = chấm sáng có bloom; đường chấm, vòng tròn chấm |
| S3 | **Dưới nước xanh rêu** (cá bơi, bass) | sương xanh dày, hạt lơ lửng, tia sáng |
| S4 | **Mặt cắt** (trời + cây trên, nước 2 lớp, đáy bùn) | camera đứng, push nhẹ; các lớp vẽ dần |
| S5 | **Đáy nông** (cát, caustics, cá nhỏ) | camera trôi chậm sát đáy |
| S6 | **Cận vật thể** (ống nước chảy, cành cây, phao) | xoá phông mạnh, camera xoay quanh |
| S7 | **Người câu nhìn ngang** (bước, dậm chân, quăng) | toàn thân, có vòng sóng chấm "thud" |
| S8 | **Card cuối** | navy, chữ + logo |

**Chuyển cảnh trong mẫu** (ưu tiên theo thứ tự):
1. Camera bám vật (mồi bay → đường chấm → crane lên thành bản đồ). Đây là cách mở video.
2. Lao qua mặt nước (bản đồ → zoom xuống → xuyên mặt nước → dưới nước xanh).
3. Dissolve nhanh 0.3-0.5 s giữa 2 cảnh cùng bố cục.
4. Hard cut chỉ khi đổi hẳn góc nhìn (vd sang S7).

## 5. Mở đầu (yêu cầu kênh)

Không mở bằng bản đồ. 0-2.5 s: S1, người câu lấy đà rồi **tung cần**, mồi phát sáng bay vút lên trời để lại vệt chấm sáng; camera ngước theo mồi, rồi theo mồi rơi xuống, liền một hơi crane lên thành bản đồ S2 với đường chấm từ bờ ra giữa ao. Hook phủ định nói đè lên toàn bộ đoạn này.

## 6. Âm thanh (đo từ video)

- Giọng: mức chính, -14 LUFS sau master (mẫu -17.4).
- Nhạc nền: có, rất nhỏ, ~20-25 dB dưới giọng, hoà âm trưởng đơn giản (nốt đo được C, G, D, G trầm), pad/pluck mềm. Kết trên hợp âm chủ.
- SFX: whoosh khi chuyển cảnh, "plop" khi mồi rơi, "thud" khi dậm chân, tiếng nước chảy ở cảnh ống nước, ambience gió/chim nhẹ ở cảnh trên bờ, tiếng nghẹt dưới nước ở cảnh dưới nước.

## 7. Nâng cấp engine so với bản test (bắt buộc cho bản full)

1. **Cây**: thay khối đa giác bằng tán lá dạng nhiều mảng "leaf cards" (texture lá vẽ procedural, alpha), thân cây phân nhánh. Rừng xa = hàng thông tam giác mờ sương.
2. **Cỏ lau / cỏ bờ**: lá dẹt cong (blade mesh), nhiều tông, đung đưa theo gió.
3. **Nước nhìn ngang**: phản chiếu có gợn (normal map procedural, méo phản chiếu), fresnel, màu `#5e7c89`.
4. **Nước bản đồ**: tối hơn, navy sâu ở giữa, sương nhẹ phủ trên, mép bùn mềm.
5. **Nhân vật**: thêm cổ, vai tròn hơn, quần đậm, áo vest xanh rêu có logo Fischlogik in trên lưng, tay áo cam đỏ, mũ pork-pie; rig vai/khuỷu cho động tác quăng, dậm chân, ngồi xổm.
6. **Cá 3D**: cá vược (bass) và cá nhỏ có vây, sọc, đuôi vẫy theo sin.
7. **Post**: bloom cho điểm sáng, xoá phông (DOF) ở S1/S6/S7, sương theo độ sâu, vignette, grade bạc (`core/three/post.js`).
8. **UI**: pill nền tối, phụ đề Plus Jakarta Sans, vàng `#fbc464`, timing karaoke theo word timestamps.
9. **Chuyển cảnh**: camera liền mạch (mục 4), không dùng flash màu.

## 8. Đầu vào mỗi tập

- `script` (tiếng Đức), `voice` (wav/mp3), `srt`.
- Lấy mốc thời gian từng từ: Whisper `small`, tiếng Đức, căn với script. SRT dùng để kiểm tra.
- Từ script, đánh dấu: từ khoá vàng, con số (callout), chương (pill), câu chốt (card cuối).
