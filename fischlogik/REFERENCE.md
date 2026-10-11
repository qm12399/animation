# Phân tích video mẫu

Nguồn: TikTok, "The Fishing Series · Episode 13: Where are the fish in a pond?" (thương hiệu Catcharium, app nhận diện cá).
Thông số: 720x1280, 30 fps, 112.4 s, giọng tiếng Anh, -17.4 LUFS.

## Style
- 3D stylized (giống three.js/Unity low-poly có ánh sáng mềm): ao nhìn từ trên xuống như bản đồ, mặt cắt dưới nước, cảnh ngang mặt nước, nhân vật câu cá dạng búp bê đơn giản (không mặt, áo có logo).
- Màu: teal/xanh rêu, cỏ vàng-xanh, nền tối. Điểm nhấn cam/vàng.
- Phụ đề karaoke giữa màn hình, từng từ sáng dần, từ khoá tô cam. Chữ sans đậm trắng, bóng nhẹ.
- Callout nhỏ dạng pill trắng/xám có chấm màu và đường dẫn (vd "bass below", "Warm · 82°F", "dead zone").
- Chương: pill số tròn ("1 NOWHERE TO HIDE", "2 NO OXYGEN").
- Tiêu đề serif nghiêng ("Where are the *fish* in a pond?"), kết thúc bằng card xanh navy + logo.
- Hạt sáng (glow dots) để chỉ vị trí cá, đường chấm cho quỹ đạo quăng câu.

## Cấu trúc kịch bản (112 s)
1. 0-5 s Hook phủ định: "Stop casting into the middle... not a single fish out there."
2. 5-9 s Câu hỏi + lời hứa: "So where are the fish? Let's read this pond like a map."
3. 9-36 s Vì sao giữa ao trống: 2 lý do có số (nowhere to hide, no oxygen), mặt cắt nhiệt độ.
4. 36-98 s Cá ở đâu: 5 mẹo, mỗi mẹo 1 cảnh (bờ gần chân, bờ hứng gió, chỗ nước chảy vào, cành cây trên mặt nước, bóng râm).
5. 98-107 s Tóm tắt trên bản đồ ao, đánh dấu từng điểm.
6. 107-112 s Câu chốt lặp lại hook: "Skip the middle. Fish the edges." + card thương hiệu.

Khoảng 2.6 từ/giây, cảnh đổi mỗi 2-6 s, camera luôn chuyển động chậm.

## Khả năng làm
- Làm được bằng three.js + pipeline lemo-opuscar. Không copy logo, nhân vật, tên series của Catcharium.
- Rủi ro chính: không có GPU. Test cảnh 3D đơn giản 1080x1920: ~1.2 s/frame với 4 worker.
  112 s x 30 fps = 3360 frame ~ 1-3 giờ render tuỳ độ nặng cảnh. Render 720x1280 (như mẫu) nhanh hơn ~2 lần.
