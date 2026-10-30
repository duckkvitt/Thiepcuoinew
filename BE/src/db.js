import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { normalizeTypographySettings } from './typography.js';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '123456',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'thiep_cuoi_app',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00',
  dateStrings: true
};

export const pool = mysql.createPool(dbConfig);

const parseJson = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const normalizeGift = (value) => {
  const gift = parseJson(value, {});
  const account = (source = {}, label) => ({
    label: source.label || label,
    bankName: source.bankName || '',
    accountName: source.accountName || '',
    accountNumber: source.accountNumber || '',
    message: source.message || '',
    qrImage: source.qrImage || ''
  });
  return {
    groom: account(gift.groom || gift, 'Chú rể'),
    bride: account(gift.bride, 'Cô dâu')
  };
};

export async function getInvitationBySlug(slug, { includeUnpublished = false } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM invitations WHERE slug = ? ${includeUnpublished ? '' : 'AND is_published = TRUE'} LIMIT 1`,
    [slug]
  );

  if (!rows.length) return null;
  const invitation = rows[0];

  const [[families], [gallery], [schedule], [locations]] = await Promise.all([
    pool.query('SELECT side, parent_label, father_name, mother_name, address FROM families WHERE invitation_id = ? ORDER BY id', [invitation.id]),
    pool.query('SELECT id, image_url, alt_text FROM gallery_images WHERE invitation_id = ? ORDER BY display_order, id', [invitation.id]),
    pool.query('SELECT time_label, title, icon FROM wedding_schedule WHERE invitation_id = ? ORDER BY display_order, id', [invitation.id]),
    pool.query('SELECT location_type, name, address, map_embed_url, directions_url FROM wedding_locations WHERE invitation_id = ? ORDER BY display_order, id', [invitation.id])
  ]);
  const groomFamily = families.find((item) => item.side === 'groom');
  const brideFamily = families.find((item) => item.side === 'bride');
  const groomHome = locations.find((item) => item.location_type === 'groom_home');
  const brideHome = locations.find((item) => item.location_type === 'bride_home');

  return {
    id: invitation.id,
    slug: invitation.slug,
    groomName: invitation.groom_name,
    brideName: invitation.bride_name,
    tagline: invitation.tagline,
    invitationHeading: invitation.invitation_heading,
    announcementText: invitation.announcement_text,
    groomRole: invitation.groom_role,
    brideRole: invitation.bride_role,
    ceremonyIntro: invitation.ceremony_intro,
    ceremonyVenue: invitation.ceremony_venue,
    weddingDate: invitation.wedding_date,
    ceremonyTime: invitation.ceremony_time,
    receptionGuestTime: invitation.reception_guest_time,
    receptionTime: invitation.reception_time,
    lunarDate: invitation.lunar_date,
    venue: {
      name: invitation.venue_name,
      address: invitation.venue_address,
      mapEmbedUrl: invitation.map_embed_url,
      directionsUrl: invitation.directions_url,
      groomHome: {
        name: groomHome?.name || 'Tư gia nhà trai',
        address: groomHome?.address || groomFamily?.address || '',
        mapUrl: groomHome?.directions_url || groomHome?.map_embed_url || '',
        mapEmbedUrl: groomHome?.map_embed_url || '',
        directionsUrl: groomHome?.directions_url || ''
      },
      brideHome: {
        name: brideHome?.name || 'Tư gia nhà gái',
        address: brideHome?.address || brideFamily?.address || '',
        mapUrl: brideHome?.directions_url || brideHome?.map_embed_url || '',
        mapEmbedUrl: brideHome?.map_embed_url || '',
        directionsUrl: brideHome?.directions_url || ''
      }
    },
    heroImage: invitation.hero_image,
    dressColors: parseJson(invitation.dress_colors, []),
    gift: normalizeGift(invitation.gift_details),
    typography: normalizeTypographySettings(parseJson(invitation.typography_settings, {})),
    music: {
      url: invitation.music_url || '',
      title: invitation.music_title || '',
      enabled: Boolean(invitation.music_enabled),
      volume: Number(invitation.music_volume ?? 0.35)
    },
    isPublished: Boolean(invitation.is_published),
    families,
    gallery,
    schedule
  };
}
