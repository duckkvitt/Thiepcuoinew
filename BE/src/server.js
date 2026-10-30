import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, getInvitationBySlug } from './db.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);

app.disable('x-powered-by');
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: error.message });
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
