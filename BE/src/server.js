import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, getInvitationBySlug } from './db.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const adminUsername = String(process.env.ADMIN_USERNAME || 'admin').trim();
const adminPassword = String(process.env.ADMIN_PASSWORD || '');
const adminSecret = String(process.env.ADMIN_SESSION_SECRET || adminPassword);
const configuredTtl = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 8 * 60 * 60);
const adminSessionTtlSeconds = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 8 * 60 * 60;
const uploadDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

const toBase64Url = (value) => Buffer.from(value).toString('base64url');
const sign = (value) => createHmac('sha256', adminSecret).update(value).digest('base64url');
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};
const createAdminToken = () => {
  const payload = toBase64Url(JSON.stringify({ role: 'admin', username: adminUsername, exp: Date.now() + adminSessionTtlSeconds * 1000 }));
  return `${payload}.${sign(payload)}`;
};
const verifyAdminToken = (token) => {
  if (!adminSecret || !token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.role === 'admin' && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
};
const requireAdmin = (req, res, next) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!adminPassword) return res.status(503).json({ message: 'Chưa cấu hình ADMIN_PASSWORD trong file .env của backend.' });
  if (!verifyAdminToken(token)) return res.status(401).json({ message: 'Phiên quản trị không hợp lệ hoặc đã hết hạn.' });
  next();
};
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const normalizeTime = (value) => {
  const time = clean(value, 8);
  return /^\d{2}:\d{2}(:\d{2})?$/.test(time) ? (time.length === 5 ? `${time}:00` : time) : null;
};
const imageTypes = {
  'image/jpeg': { extension: 'jpg', valid: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: 'png', valid: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', valid: (buffer) => buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' },
  'image/gif': { extension: 'gif', valid: (buffer) => ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString()) }
};

app.disable('x-powered-by');
app.use(cors({ origin: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL)?.split(',').map((item) => item.trim()).filter(Boolean) || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));
app.use('/uploads', express.static(uploadDirectory, { fallthrough: false, maxAge: '7d' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: error.message });
  }
});

app.post('/api/admin/login', (req, res) => {
  if (!adminPassword) return res.status(503).json({ message: 'Chưa cấu hình ADMIN_PASSWORD trong file .env của backend.' });
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) {
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu quản trị không đúng.' });
  }
  res.json({ token: createAdminToken(), username: adminUsername, expiresIn: adminSessionTtlSeconds });
});

app.post(
  '/api/admin/uploads',
  requireAdmin,
  express.raw({ type: Object.keys(imageTypes), limit: '8mb' }),
  async (req, res, next) => {
    try {
      const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
      const imageType = imageTypes[contentType];
      if (!imageType || !Buffer.isBuffer(req.body) || req.body.length === 0 || !imageType.valid(req.body)) {
        return res.status(415).json({ message: 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF hợp lệ.' });
      }
      const fileName = `${Date.now()}-${randomUUID()}.${imageType.extension}`;
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(resolve(uploadDirectory, fileName), req.body, { flag: 'wx' });
      res.status(201).json({
        message: 'Tải ảnh lên thành công.',
        imageUrl: `${req.protocol}://${req.get('host')}/uploads/${fileName}`
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/admin/invitations/:slug', requireAdmin, async (req, res, next) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug, { includeUnpublished: true });
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    res.json(invitation);
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/invitations/:slug', requireAdmin, async (req, res, next) => {
  const data = req.body || {};
  const families = Array.isArray(data.families) ? data.families : [];
  const gallery = Array.isArray(data.gallery) ? data.gallery : [];
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const dressColors = Array.isArray(data.dressColors) ? data.dressColors.map((item) => clean(item, 20)).filter(Boolean) : [];
  const groomHome = data.venue?.groomHome || {};
  const brideHome = data.venue?.brideHome || {};
  const ceremonyTime = normalizeTime(data.ceremonyTime);
  const receptionGuestTime = normalizeTime(data.receptionGuestTime);
  const receptionTime = normalizeTime(data.receptionTime);

  if (!clean(data.groomName, 120) || !clean(data.brideName, 120) || !/^\d{4}-\d{2}-\d{2}$/.test(clean(data.weddingDate, 10)) ||
      !ceremonyTime || !receptionGuestTime || !receptionTime || !clean(data.venue?.name, 200) || !clean(data.venue?.address, 500) ||
      !clean(groomHome.name, 200) || !clean(groomHome.address, 500) || !clean(brideHome.name, 200) || !clean(brideHome.address, 500) ||
      families.length !== 2 || gallery.length < 1 || gallery.length > 30 || schedule.length < 1 || schedule.length > 30 ||
      dressColors.length < 1 || dressColors.length > 10) {
    return res.status(400).json({ message: 'Dữ liệu thiệp chưa đầy đủ hoặc không hợp lệ.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[invitation]] = await connection.query('SELECT id FROM invitations WHERE slug = ? LIMIT 1', [req.params.slug]);
    if (!invitation) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    }

    await connection.query(
      `UPDATE invitations SET groom_name = ?, bride_name = ?, tagline = ?, wedding_date = ?, ceremony_time = ?,
       reception_guest_time = ?, reception_time = ?, lunar_date = ?, venue_name = ?, venue_address = ?,
       map_embed_url = ?, directions_url = ?, hero_image = ?, dress_colors = ?, gift_details = ?, is_published = ?
       WHERE id = ?`,
      [
        clean(data.groomName, 120), clean(data.brideName, 120), clean(data.tagline, 255), clean(data.weddingDate, 10), ceremonyTime,
        receptionGuestTime, receptionTime, clean(data.lunarDate, 150), clean(data.venue.name, 200), clean(data.venue.address, 500),
        clean(data.venue.mapEmbedUrl, 2000), clean(data.venue.directionsUrl, 2000), clean(data.heroImage, 255),
        JSON.stringify(dressColors), JSON.stringify({
          bankName: clean(data.gift?.bankName, 100),
          accountName: clean(data.gift?.accountName, 120),
          accountNumber: clean(data.gift?.accountNumber, 60),
          message: clean(data.gift?.message, 255)
        }), data.isPublished === false ? 0 : 1, invitation.id
      ]
    );

    await connection.query('DELETE FROM families WHERE invitation_id = ?', [invitation.id]);
    for (const family of families) {
      const side = family.side === 'bride' ? 'bride' : 'groom';
      await connection.query(
        `INSERT INTO families (invitation_id, side, parent_label, father_name, mother_name, address) VALUES (?, ?, ?, ?, ?, ?)`,
        [invitation.id, side, clean(family.parent_label, 50), clean(family.father_name, 120), clean(family.mother_name, 120), clean(family.address, 255)]
      );
    }

    await connection.query('DELETE FROM wedding_locations WHERE invitation_id = ?', [invitation.id]);
    for (const [index, location] of [
      { type: 'groom_home', ...groomHome },
      { type: 'bride_home', ...brideHome }
    ].entries()) {
      await connection.query(
        `INSERT INTO wedding_locations (invitation_id, location_type, name, address, map_embed_url, directions_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invitation.id, location.type, clean(location.name, 200), clean(location.address, 500), clean(location.mapEmbedUrl, 2000), clean(location.directionsUrl, 2000), index + 1]
      );
    }

    await connection.query('DELETE FROM gallery_images WHERE invitation_id = ?', [invitation.id]);
    for (const [index, image] of gallery.entries()) {
      const imageUrl = clean(image.image_url, 255);
      if (!imageUrl) throw new Error('Ảnh trong album phải có đường dẫn.');
      await connection.query(
        'INSERT INTO gallery_images (invitation_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)',
        [invitation.id, imageUrl, clean(image.alt_text, 255), index + 1]
      );
    }

    await connection.query('DELETE FROM wedding_schedule WHERE invitation_id = ?', [invitation.id]);
    for (const [index, item] of schedule.entries()) {
      const time = normalizeTime(item.time_label);
      const title = clean(item.title, 150);
      if (!time || !title) throw new Error('Mốc thời gian trong lịch trình chưa hợp lệ.');
      await connection.query(
        'INSERT INTO wedding_schedule (invitation_id, time_label, title, icon, display_order) VALUES (?, ?, ?, ?, ?)',
        [invitation.id, time.slice(0, 5), title, clean(item.icon || 'heart', 30), index + 1]
      );
    }

    await connection.commit();
    const updated = await getInvitationBySlug(req.params.slug, { includeUnpublished: true });
    res.json({ message: 'Đã lưu thay đổi cho thiệp cưới.', invitation: updated });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.get('/api/admin/invitations/:slug/submissions', requireAdmin, async (req, res, next) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug, { includeUnpublished: true });
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    const [[wishes], [rsvps]] = await Promise.all([
      pool.query(
        `SELECT id, guest_name AS guestName, message, is_visible AS isVisible, created_at AS createdAt
         FROM wishes WHERE invitation_id = ? ORDER BY created_at DESC`,
        [invitation.id]
      ),
      pool.query(
        `SELECT id, guest_name AS guestName, phone, attendance, guest_count AS guestCount, note, created_at AS createdAt
         FROM rsvps WHERE invitation_id = ? ORDER BY created_at DESC`,
        [invitation.id]
      )
    ]);
    res.json({ wishes: wishes.map((item) => ({ ...item, isVisible: Boolean(item.isVisible) })), rsvps });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/invitations/:slug/wishes/:id', requireAdmin, async (req, res, next) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug, { includeUnpublished: true });
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    const [result] = await pool.query(
      'UPDATE wishes SET is_visible = ? WHERE id = ? AND invitation_id = ?',
      [req.body.isVisible ? 1 : 0, Number(req.params.id), invitation.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Không tìm thấy lời chúc.' });
    res.json({ message: req.body.isVisible ? 'Đã hiển thị lời chúc.' : 'Đã ẩn lời chúc.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/invitations/:slug', async (req, res, next) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    res.json(invitation);
  } catch (error) {
    next(error);
  }
});

app.get('/api/invitations/:slug/wishes', async (req, res, next) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });

    const [rows] = await pool.query(
      `SELECT id, guest_name AS guestName, message, created_at AS createdAt
       FROM wishes WHERE invitation_id = ? AND is_visible = TRUE
       ORDER BY created_at DESC LIMIT 50`,
      [invitation.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/invitations/:slug/wishes', async (req, res, next) => {
  try {
    const guestName = String(req.body.guestName || '').trim();
    const message = String(req.body.message || '').trim();
    if (guestName.length < 2 || guestName.length > 100 || message.length < 3 || message.length > 500) {
      return res.status(400).json({ message: 'Vui lòng nhập tên và lời chúc hợp lệ (tối đa 500 ký tự).' });
    }

    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });

    const [result] = await pool.query(
      'INSERT INTO wishes (invitation_id, guest_name, message) VALUES (?, ?, ?)',
      [invitation.id, guestName, message]
    );
    const [[wish]] = await pool.query(
      `SELECT id, guest_name AS guestName, message, created_at AS createdAt FROM wishes WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(wish);
  } catch (error) {
    next(error);
  }
});

app.post('/api/invitations/:slug/rsvps', async (req, res, next) => {
  try {
    const guestName = String(req.body.guestName || '').trim();
    const phone = String(req.body.phone || '').trim();
    const attendance = String(req.body.attendance || 'attending');
    const guestCount = Number(req.body.guestCount || 1);
    const note = String(req.body.note || '').trim();
    const validAttendance = ['attending', 'not_attending', 'maybe'].includes(attendance);

    if (guestName.length < 2 || guestName.length > 100 || !validAttendance || guestCount < 1 || guestCount > 10 || note.length > 500) {
      return res.status(400).json({ message: 'Thông tin xác nhận tham dự chưa hợp lệ.' });
    }

    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });

    const [result] = await pool.query(
      `INSERT INTO rsvps (invitation_id, guest_name, phone, attendance, guest_count, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invitation.id, guestName, phone || null, attendance, guestCount, note || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Cảm ơn bạn đã xác nhận tham dự!' });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Máy chủ đang bận. Vui lòng thử lại sau.' });
});

app.listen(port, () => {
  console.log(`Wedding API running at http://localhost:${port}`);
});
