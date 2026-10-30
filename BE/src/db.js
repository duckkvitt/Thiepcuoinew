import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'thiep_cuoi_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00',
  dateStrings: true
};

export const pool = mysql.createPool(dbConfig);

export async function getInvitationBySlug(slug) {
  const [rows] = await pool.query(
    `SELECT * FROM invitations WHERE slug = ? AND is_published = TRUE LIMIT 1`,
    [slug]
  );

  if (!rows.length) return null;
  const invitation = rows[0];

  const [[families], [gallery], [schedule]] = await Promise.all([
    pool.query('SELECT side, parent_label, father_name, mother_name, address FROM families WHERE invitation_id = ? ORDER BY id', [invitation.id]),
    pool.query('SELECT id, image_url, alt_text FROM gallery_images WHERE invitation_id = ? ORDER BY display_order, id', [invitation.id]),
    pool.query('SELECT time_label, title, icon FROM wedding_schedule WHERE invitation_id = ? ORDER BY display_order, id', [invitation.id])
  ]);

  return {
    id: invitation.id,
    slug: invitation.slug,
    groomName: invitation.groom_name,
    brideName: invitation.bride_name,
    tagline: invitation.tagline,
    weddingDate: invitation.wedding_date,
    ceremonyTime: invitation.ceremony_time,
    receptionGuestTime: invitation.reception_guest_time,
    receptionTime: invitation.reception_time,
    lunarDate: invitation.lunar_date,
    venue: {
      name: invitation.venue_name,
      address: invitation.venue_address,
      mapEmbedUrl: invitation.map_embed_url,
      directionsUrl: invitation.directions_url
    },
    heroImage: invitation.hero_image,
    dressColors: invitation.dress_colors,
    gift: invitation.gift_details,
    families,
    gallery,
    schedule
  };
}
