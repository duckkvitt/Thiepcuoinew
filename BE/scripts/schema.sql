CREATE TABLE IF NOT EXISTS invitations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  groom_name VARCHAR(120) NOT NULL,
  bride_name VARCHAR(120) NOT NULL,
  tagline VARCHAR(255) DEFAULT 'SAVE THE DATE',
  wedding_date DATE NOT NULL,
  ceremony_time TIME NOT NULL,
  reception_guest_time TIME NOT NULL,
  reception_time TIME NOT NULL,
  lunar_date VARCHAR(150),
  venue_name VARCHAR(200) NOT NULL,
  venue_address VARCHAR(500) NOT NULL,
  map_embed_url TEXT,
  directions_url TEXT,
  hero_image VARCHAR(255) NOT NULL,
  dress_colors JSON NOT NULL,
  gift_details JSON NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS families (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  side ENUM('groom', 'bride') NOT NULL,
  parent_label VARCHAR(50) DEFAULT 'Ông Bà',
  father_name VARCHAR(120) NOT NULL,
  mother_name VARCHAR(120) NOT NULL,
  address VARCHAR(255),
  CONSTRAINT fk_families_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_gallery_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wedding_schedule (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  time_label VARCHAR(20) NOT NULL,
  title VARCHAR(150) NOT NULL,
  icon VARCHAR(30) DEFAULT 'heart',
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_schedule_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  guest_name VARCHAR(100) NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishes_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  INDEX idx_wishes_invitation_created (invitation_id, created_at)
);

CREATE TABLE IF NOT EXISTS rsvps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  guest_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  attendance ENUM('attending', 'not_attending', 'maybe') NOT NULL,
  guest_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
  note VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rsvps_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  INDEX idx_rsvps_invitation_created (invitation_id, created_at)
);

INSERT INTO invitations (
  id, slug, groom_name, bride_name, tagline, wedding_date, ceremony_time,
  reception_guest_time, reception_time, lunar_date, venue_name, venue_address,
  map_embed_url, directions_url, hero_image, dress_colors, gift_details
) VALUES (
  1, 'hoang-long-bao-ngoc', 'Hoàng Long', 'Bảo Ngọc', 'SAVE THE DATE', '2026-01-03', '09:00:00',
  '17:30:00', '18:00:00', '(Tức ngày 15 tháng 11 năm Ất Tỵ)',
  'Trung Tâm Hội Nghị White Palace', '194 Hoàng Văn Thụ, Phường 9, Quận Phú Nhuận, TP. Hồ Chí Minh',
  'https://www.google.com/maps?q=White+Palace+Hoang+Van+Thu&output=embed',
  'https://www.google.com/maps/dir/?api=1&destination=White+Palace+Hoang+Van+Thu',
  '/images/wedding-hero.png',
  JSON_ARRAY('#5b1118', '#963b43', '#d6aa46', '#eee5d8'),
  JSON_OBJECT('bankName', 'Vietcombank', 'accountName', 'DANG HOANG LONG', 'accountNumber', '0123456789', 'message', 'HLBN 03012026')
) ON DUPLICATE KEY UPDATE
  groom_name = VALUES(groom_name), bride_name = VALUES(bride_name), wedding_date = VALUES(wedding_date);

INSERT INTO families (id, invitation_id, side, parent_label, father_name, mother_name, address) VALUES
  (1, 1, 'groom', 'Ông Bà', 'Đặng Văn Thắng', 'Bùi Thị Mai', 'Quận 1, TP. Hồ Chí Minh'),
  (2, 1, 'bride', 'Ông Bà', 'Vũ Đức Trung', 'Ngô Thị Hạnh', 'Quận 3, TP. Hồ Chí Minh')
ON DUPLICATE KEY UPDATE father_name = VALUES(father_name), mother_name = VALUES(mother_name), address = VALUES(address);

INSERT INTO gallery_images (id, invitation_id, image_url, alt_text, display_order) VALUES
  (1, 1, '/images/wedding-hero.png', 'Cô dâu chú rể bên nhau', 1),
  (2, 1, '/images/wedding-gallery.png', 'Khoảnh khắc hạnh phúc của cô dâu chú rể', 2),
  (3, 1, '/images/wedding-hero.png', 'Ảnh cưới Hoàng Long và Bảo Ngọc', 3),
  (4, 1, '/images/wedding-gallery.png', 'Cô dâu chú rể nắm tay', 4)
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), alt_text = VALUES(alt_text), display_order = VALUES(display_order);

INSERT INTO wedding_schedule (id, invitation_id, time_label, title, icon, display_order) VALUES
  (1, 1, '17:00', 'Đón khách', 'camera', 1),
  (2, 1, '18:00', 'Khai tiệc', 'glass', 2),
  (3, 1, '18:30', 'Nghi thức cưới', 'rings', 3),
  (4, 1, '19:00', 'Cắt bánh & nâng ly', 'cake', 4),
  (5, 1, '20:30', 'Kết thúc tiệc', 'heart', 5)
ON DUPLICATE KEY UPDATE time_label = VALUES(time_label), title = VALUES(title), icon = VALUES(icon), display_order = VALUES(display_order);

INSERT INTO wishes (id, invitation_id, guest_name, message, created_at) VALUES
  (1, 1, 'Duy Khang', 'Chúc mừng ngày vui của hai bạn, trăm năm hạnh phúc bên nhau!', '2026-07-26 12:30:49'),
  (2, 1, 'Lan Chi', 'Đẹp đôi quá! Chúc hai bạn sống bên nhau đầu bạc răng long.', '2026-07-26 12:30:49'),
  (3, 1, 'Tuấn Anh', 'Mừng hạnh phúc hai bạn! Chúc gia đình nhỏ luôn đầy ắp tiếng cười.', '2026-07-26 12:30:49')
ON DUPLICATE KEY UPDATE guest_name = VALUES(guest_name), message = VALUES(message);
