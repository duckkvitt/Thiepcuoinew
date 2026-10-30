import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, getInvitationBySlug } from './db.js';
import { adminLoginSchema, rsvpSchema, wishSchema, wishVisibilitySchema } from './validation.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const adminPassword = String(process.env.ADMIN_PASSWORD || '');
const adminSecret = String(process.env.ADMIN_SESSION_SECRET || adminPassword);
const adminApiKey = String(process.env.ADMIN_API_KEY || '');
const configuredTtl = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 8 * 60 * 60);
const adminSessionTtlSeconds = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 8 * 60 * 60;
const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uploadDirectory = resolve(projectDirectory, 'uploads');
const publicDirectory = resolve(projectDirectory, 'public');

const toBase64Url = (value) => Buffer.from(value).toString('base64url');
const sign = (value) => createHmac('sha256', adminSecret).update(value).digest('base64url');
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};
const createAdminToken = (username) => {
  const payload = toBase64Url(JSON.stringify({ role: 'admin', username, exp: Date.now() + adminSessionTtlSeconds * 1000 }));
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
  const apiKey = String(req.headers['x-api-key'] || '');
  if (adminApiKey && (safeEqual(apiKey, adminApiKey) || safeEqual(token, adminApiKey))) return next();
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
const googleMapsUrlCache = new Map();
const resolveGoogleMapsUrl = async (value) => {
  const mapUrl = clean(value, 2000);
  let url;
  try { url = new URL(mapUrl); } catch { return mapUrl; }
  const isShortGoogleUrl = url.hostname === 'maps.app.goo.gl' || (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps'));
  if (!isShortGoogleUrl) return mapUrl;
  if (googleMapsUrlCache.has(mapUrl)) return googleMapsUrlCache.get(mapUrl);
  try {
    let response = await fetch(mapUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(7000) });
    let resolved = response.url || mapUrl;
    if (resolved === mapUrl || new URL(resolved).hostname === url.hostname) {
      response = await fetch(mapUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(7000)
      });
      resolved = response.url || mapUrl;
      await response.body?.cancel();
    }
    googleMapsUrlCache.set(mapUrl, resolved);
    return resolved;
  } catch {
    return mapUrl;
  }
};

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL)?.split(',').map((item) => item.trim()).filter(Boolean) || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));
app.use('/uploads', express.static(uploadDirectory, { fallthrough: false, maxAge: '7d' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const publicWriteLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: error.message });
  }
});

app.post('/api/admin/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = adminLoginSchema.parse(req.body);
    const [[account]] = await pool.query(
      'SELECT username, password_hash AS passwordHash, is_active AS isActive FROM admins WHERE username = ? LIMIT 1',
      [username]
    );
    const passwordMatches = account ? await bcrypt.compare(password, account.passwordHash) : false;
    if (!account || !Boolean(account.isActive) || !passwordMatches) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu quản trị không đúng.' });
    }
    res.json({ token: createAdminToken(account.username), username: account.username, expiresIn: adminSessionTtlSeconds });
  } catch (error) {
    next(error);
  }
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
      !clean(data.invitationHeading, 150) || !clean(data.announcementText, 500) || !clean(data.ceremonyIntro, 255) || !clean(data.ceremonyVenue, 200) ||
      !ceremonyTime || !receptionGuestTime || !receptionTime || !clean(data.venue?.name, 200) || !clean(data.venue?.address, 500) ||
      !clean(groomHome.name, 200) || !clean(groomHome.address, 500) || !clean(brideHome.name, 200) || !clean(brideHome.address, 500) ||
      families.length !== 2 || gallery.length < 1 || gallery.length > 30 || schedule.length < 1 || schedule.length > 30 ||
      dressColors.length < 1 || dressColors.length > 10) {
    return res.status(400).json({ message: 'Dữ liệu thiệp chưa đầy đủ hoặc không hợp lệ.' });
  }
  const [groomMapUrl, brideMapUrl] = await Promise.all([
    resolveGoogleMapsUrl(groomHome.mapUrl || groomHome.directionsUrl || groomHome.mapEmbedUrl),
    resolveGoogleMapsUrl(brideHome.mapUrl || brideHome.directionsUrl || brideHome.mapEmbedUrl)
  ]);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[invitation]] = await connection.query('SELECT id FROM invitations WHERE slug = ? LIMIT 1', [req.params.slug]);
    if (!invitation) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    }

    await connection.query(
      `UPDATE invitations SET groom_name = ?, bride_name = ?, tagline = ?, invitation_heading = ?, announcement_text = ?,
       groom_role = ?, bride_role = ?, ceremony_intro = ?, ceremony_venue = ?, wedding_date = ?, ceremony_time = ?,
       reception_guest_time = ?, reception_time = ?, lunar_date = ?, venue_name = ?, venue_address = ?,
       map_embed_url = ?, directions_url = ?, hero_image = ?, dress_colors = ?, gift_details = ?, is_published = ?
       WHERE id = ?`,
      [
        clean(data.groomName, 120), clean(data.brideName, 120), clean(data.tagline, 255), clean(data.invitationHeading, 150),
        clean(data.announcementText, 500), clean(data.groomRole, 100), clean(data.brideRole, 100),
        clean(data.ceremonyIntro, 255), clean(data.ceremonyVenue, 200), clean(data.weddingDate, 10), ceremonyTime,
        receptionGuestTime, receptionTime, clean(data.lunarDate, 150), clean(data.venue.name, 200), clean(data.venue.address, 500),
        clean(data.venue.mapEmbedUrl, 2000), clean(data.venue.directionsUrl, 2000), clean(data.heroImage, 255),
        JSON.stringify(dressColors), JSON.stringify({
          groom: {
            label: clean(data.gift?.groom?.label || 'Chú rể', 50),
            bankName: clean(data.gift?.groom?.bankName, 100),
            accountName: clean(data.gift?.groom?.accountName, 120),
            accountNumber: clean(data.gift?.groom?.accountNumber, 60),
            message: clean(data.gift?.groom?.message, 255),
            qrImage: clean(data.gift?.groom?.qrImage, 255)
          },
          bride: {
            label: clean(data.gift?.bride?.label || 'Cô dâu', 50),
            bankName: clean(data.gift?.bride?.bankName, 100),
            accountName: clean(data.gift?.bride?.accountName, 120),
            accountNumber: clean(data.gift?.bride?.accountNumber, 60),
            message: clean(data.gift?.bride?.message, 255),
            qrImage: clean(data.gift?.bride?.qrImage, 255)
          }
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
      { type: 'groom_home', ...groomHome, mapUrl: groomMapUrl },
      { type: 'bride_home', ...brideHome, mapUrl: brideMapUrl }
    ].entries()) {
      await connection.query(
        `INSERT INTO wedding_locations (invitation_id, location_type, name, address, map_embed_url, directions_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invitation.id, location.type, clean(location.name, 200), clean(location.address, 500), '', clean(location.mapUrl, 2000), index + 1]
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
    const { isVisible } = wishVisibilitySchema.parse(req.body);
    const invitation = await getInvitationBySlug(req.params.slug, { includeUnpublished: true });
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    const [result] = await pool.query(
      'UPDATE wishes SET is_visible = ? WHERE id = ? AND invitation_id = ?',
      [isVisible ? 1 : 0, Number(req.params.id), invitation.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Không tìm thấy lời chúc.' });
    res.json({ message: isVisible ? 'Đã hiển thị lời chúc.' : 'Đã ẩn lời chúc.' });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/invitations/:slug/wishes/:id', requireAdmin, async (req, res, next) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug, { includeUnpublished: true });
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });
    const [result] = await pool.query('DELETE FROM wishes WHERE id = ? AND invitation_id = ?', [Number(req.params.id), invitation.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Không tìm thấy lời chúc.' });
    res.json({ message: 'Đã xóa lời chúc.' });
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

app.post('/api/invitations/:slug/wishes', publicWriteLimiter, async (req, res, next) => {
  try {
    const { guestName, message } = wishSchema.parse(req.body);

    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) return res.status(404).json({ message: 'Không tìm thấy thiệp cưới.' });

    const [result] = await pool.query(
      'INSERT INTO wishes (invitation_id, guest_name, message, is_visible) VALUES (?, ?, ?, ?)',
      [invitation.id, guestName, message, String(process.env.WISHES_REQUIRE_APPROVAL).toLowerCase() === 'true' ? 0 : 1]
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

app.post('/api/invitations/:slug/rsvps', publicWriteLimiter, async (req, res, next) => {
  try {
    const { guestName, phone, attendance, guestCount, note } = rsvpSchema.parse(req.body);

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

app.use(express.static(publicDirectory, { index: false, maxAge: '1h' }));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(resolve(publicDirectory, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Dữ liệu gửi lên chưa hợp lệ.', issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  }
  console.error(error);
  res.status(500).json({ message: 'Máy chủ đang bận. Vui lòng thử lại sau.' });
});

app.listen(port, () => {
  console.log(`Wedding API running at http://localhost:${port}`);
});
