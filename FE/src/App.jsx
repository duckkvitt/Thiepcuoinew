import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, Gift, Heart,
  Flower2, MapPin, Navigation, QrCode, Send, Sparkles, X
} from 'lucide-react';
import { invitationApi } from './api.js';
import { googleMapsEmbedUrl } from './mapUtils.js';
import './styles.css';

const pad = (value) => String(value).padStart(2, '0');
const toLocalDate = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00`);
const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'admin';
const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';
const ENTRY_OPEN_DURATION_MS = 1850;
const getHeartFallSeconds = (randomValue) => Number((50 + 20 * randomValue).toFixed(1));
const formatWeddingDate = (value) => {
  const date = toLocalDate(value);
  return `${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
};

function EntryGate({ data, inviteeName, onOpened }) {
  const [opening, setOpening] = useState(false);
  const date = toLocalDate(data.weddingDate);
  const petals = [
    [4, -6, getHeartFallSeconds(.12), 18, 36, 'heart'], [11, 2.1, 18.5, 15, -42, 'flower'],
    [18, -38, getHeartFallSeconds(.85), 15, 54, 'heart'], [25, 1.2, 20.5, 13, -28, 'flower'],
    [33, -18, getHeartFallSeconds(.35), 20, 48, 'heart'], [41, 7.1, 19.5, 16, -52, 'flower'],
    [49, -52, getHeartFallSeconds(.65), 15, 34, 'heart'], [57, 6.2, 21.5, 14, -44, 'flower'],
    [65, -29, getHeartFallSeconds(.25), 20, 46, 'heart'], [72, 4.9, 19, 15, -38, 'flower'],
    [79, -12, getHeartFallSeconds(.75), 17, 55, 'heart'], [85, 3.5, 20, 13, -48, 'flower'],
    [91, -45, getHeartFallSeconds(.5), 18, 32, 'heart'], [96, 6.7, 19.5, 14, -36, 'flower'],
    [15, -33, getHeartFallSeconds(.95), 14, 62, 'heart'], [61, -57, getHeartFallSeconds(.4), 17, -58, 'heart']
  ];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const openInvitation = () => {
    if (opening) return;
    setOpening(true);
    window.setTimeout(onOpened, ENTRY_OPEN_DURATION_MS);
  };

  return <div className={`entry-gate${opening ? ' opening' : ''}`} role="dialog" aria-modal="true" aria-label="Mở thiệp cưới">
    <div className="entry-glow" aria-hidden="true" />
    <div className="entry-petals" aria-hidden="true">{petals.map(([left, delay, duration, size, drift, type], index) => {
      const Particle = type === 'flower' ? Flower2 : Heart;
      return <Particle key={index} className={`entry-petal ${type}`} style={{ '--left': `${left}%`, '--delay': `${delay}s`, '--duration': `${duration}s`, '--size': `${size}px`, '--drift': `${drift}px`, '--end-drift': `${-drift / 2}px` }} fill={type === 'heart' ? 'currentColor' : 'none'} />;
    })}</div>
    <section className="entry-card">
      <Floral className="entry-floral left" />
      <Floral className="entry-floral right" />
      <div className="entry-seal"><Heart fill="currentColor" strokeWidth={0} /></div>
      <p className="entry-kicker">Wedding invitation</p>
      <div className="entry-names"><strong>{data.groomName}</strong><i>&amp;</i><strong>{data.brideName}</strong></div>
      <div className="entry-ornament"><span />◆<span /></div>
      <time dateTime={String(data.weddingDate).slice(0, 10)}>{formatWeddingDate(data.weddingDate)}</time>
      <p className={`entry-invite${inviteeName ? ' personalized' : ''}`}><span>Thân Mời</span>{inviteeName && <strong>{inviteeName}</strong>}</p>
      <button type="button" onClick={openInvitation} disabled={opening} autoFocus>{opening ? 'Đang mở...' : 'Mở thiệp'}<span aria-hidden="true" /></button>
      <small>{pad(date.getDate())} · {pad(date.getMonth() + 1)} · {date.getFullYear()}</small>
    </section>
    <p className="entry-hint">Chạm để mở lời mời của chúng tôi</p>
  </div>;
}

function SectionTitle({ eyebrow, title, light = false }) {
  return <div className={`section-title ${light ? 'light' : ''}`}>
    {eyebrow && <span>{eyebrow}</span>}
    <h2>{title}</h2>
    <i aria-hidden="true">◆</i>
  </div>;
}

function Floral({ className = '' }) {
  return <img className={`floral ${className}`} src="/images/burgundy-flowers.png" alt="" aria-hidden="true" />;
}

function Hero({ data }) {
  const date = toLocalDate(data.weddingDate);
  return <header id="hero" className="hero">
    <div className="hero-topline"><span />{data.tagline}<span /></div>
    <div className="envelope-scene">
      <Floral className="hero-floral" />
      <div className="photo-card"><img src={data.heroImage} alt={`Ảnh cưới ${data.groomName} và ${data.brideName}`} /></div>
      <div className="envelope-back" />
      <div className="envelope-front" />
      <div className="wax-seal"><Heart size={24} strokeWidth={1.5} /></div>
    </div>
    <div className="hero-names">
      <p>{data.groomName}</p><span>&amp;</span><p>{data.brideName}</p>
    </div>
    <p className="hero-date">{pad(date.getDate())} · {pad(date.getMonth() + 1)} · {date.getFullYear()}</p>
    <a className="scroll-cue" href="#invitation" aria-label="Xem thông tin lễ cưới"><span /></a>
  </header>;
}

function Family({ family }) {
  return <div className="family">
    <span>{family.parent_label}</span>
    <strong>{family.father_name}</strong>
    <strong>{family.mother_name}</strong>
    <small>{family.address}</small>
  </div>;
}

function DateLockup({ data }) {
  const date = toLocalDate(data.weddingDate);
  return <div className="date-lockup">
    <div><span>VÀO LÚC {data.ceremonyTime.slice(0, 5)}</span><span>THỨ BẢY</span></div>
    <div className="date-core"><b>{pad(date.getDate())}</b><i /><p><strong>THÁNG {pad(date.getMonth() + 1)}</strong><span>{date.getFullYear()}</span></p></div>
    <small>{data.lunarDate}</small>
  </div>;
}

function InvitationCard({ data }) {
  const groomFamily = data.families.find((item) => item.side === 'groom');
  const brideFamily = data.families.find((item) => item.side === 'bride');
  return <section id="invitation" className="section paper-section invitation-wrap">
    <div className="burgundy-card invitation-card">
      <SectionTitle title={data.invitationHeading} light />
      <div className="families">
        {groomFamily && <Family family={groomFamily} />}
        <div className="family-divider" />
        {brideFamily && <Family family={brideFamily} />}
      </div>
      <p className="formal-copy">{data.announcementText}</p>
      <div className="couple-names"><h3>{data.groomName}</h3>{data.groomRole && <em>{data.groomRole}</em>}<b>&amp;</b><h3>{data.brideName}</h3>{data.brideRole && <em>{data.brideRole}</em>}</div>
      <p className="venue-home">{data.ceremonyIntro}<br /><strong>{data.ceremonyVenue}</strong></p>
      <DateLockup data={data} />
      <Floral className="card-floral" />
    </div>
  </section>;
}

function Gallery({ data }) {
  const [active, setActive] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const images = data.gallery;
  const move = (direction) => {
    if (images.length < 2) return;
    setActive((current) => (current + direction + images.length) % images.length);
  };

  const startSwipe = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest('button')) return;
    dragStart.current = { pointerId: event.pointerId, x: event.clientX };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
    setDragX(0);
  };

  const updateSwipe = (event) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragStart.current.x;
    setDragX(Math.max(-140, Math.min(140, distance)));
  };

  const finishSwipe = (event) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragStart.current.x;
    dragStart.current = null;
    setIsDragging(false);
    setDragX(0);
    if (Math.abs(distance) >= 48) move(distance < 0 ? 1 : -1);
  };

  const cancelSwipe = () => {
    dragStart.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  return <section id="gallery" className="section gallery-section">
    <SectionTitle title="Album ảnh" />
    <div
      className={`gallery-stage${isDragging ? ' is-dragging' : ''}`}
      style={{ '--drag-x': `${dragX}px`, '--drag-tilt': `${dragX / 9}deg` }}
      onPointerDown={startSwipe}
      onPointerMove={updateSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={cancelSwipe}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      }}
      role="region"
      tabIndex="0"
      aria-label="Album ảnh cưới, vuốt hoặc dùng phím mũi tên để chuyển ảnh"
    >
      <button onClick={() => move(-1)} aria-label="Ảnh trước"><ChevronLeft /></button>
      {images.map((image, index) => {
        const offset = (index - active + images.length) % images.length;
        let position = 'hidden';
        if (offset === 0) position = 'active';
        else if (offset === 1) position = 'next';
        else if (offset === images.length - 1) position = 'prev';
        return <img key={image.id} className={`gallery-image ${position}`} src={image.image_url} alt={image.alt_text} draggable="false" />;
      })}
      <button onClick={() => move(1)} aria-label="Ảnh kế"><ChevronRight /></button>
    </div>
    <div className="gallery-dots">
      {images.map((image, index) => <button key={image.id} onClick={() => setActive(index)} className={index === active ? 'active' : ''} aria-label={`Xem ảnh ${index + 1}`} />)}
    </div>
  </section>;
}

function MonthCalendar({ weddingDate }) {
  const date = useMemo(() => toLocalDate(weddingDate), [weddingDate]);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayIndex = firstDay === 0 ? 6 : firstDay - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [...Array(mondayIndex).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  return <div className="calendar-card">
    <h3>Tháng {month + 1} / {year}</h3>
    <div className="calendar-grid week"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
    <div className="calendar-grid days">
      {days.map((day, index) => <span key={`${day}-${index}`} className={day === date.getDate() ? 'chosen' : ''}>{day || ''}</span>)}
    </div>
  </div>;
}

function addToCalendar(data) {
  const date = String(data.weddingDate).slice(0, 10).replaceAll('-', '');
  const start = data.receptionTime.slice(0, 5).replace(':', '') + '00';
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `DTSTART:${date}T${start}`,
    `DTEND:${date}T210000`,
    `SUMMARY:Lễ cưới ${data.groomName} & ${data.brideName}`,
    `LOCATION:${data.venue.name} - ${data.venue.address}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'le-cuoi-hoang-long-bao-ngoc.ics'; link.click();
  URL.revokeObjectURL(url);
}

function Reception({ data, onRsvp }) {
  const date = toLocalDate(data.weddingDate);
  return <section id="reception" className="section reception-section">
    <div className="burgundy-card reception-card">
      <SectionTitle title="Thông tin tiệc cưới" light />
      <h3>TIỆC CƯỚI SẼ DIỄN RA VÀO LÚC:</h3>
      <div className="reception-time"><span>{data.receptionTime.slice(0, 5)}</span><span>THỨ BẢY</span></div>
      <div className="date-core large"><b>{pad(date.getDate())}</b><i /><p><strong>THÁNG {pad(date.getMonth() + 1)}</strong><span>{date.getFullYear()}</span></p></div>
      <p className="lunar">{data.lunarDate}</p>
      <div className="service-times"><p><span>ĐÓN KHÁCH</span><b>{data.receptionGuestTime.slice(0, 5)}</b></p><p><span>KHAI TIỆC</span><b>{data.receptionTime.slice(0, 5)}</b></p></div>
      <MonthCalendar weddingDate={data.weddingDate} />
      <button className="text-button" onClick={() => addToCalendar(data)}><CalendarPlus size={16} /> Thêm vào lịch</button>
      <button className="cream-button" onClick={onRsvp}>XÁC NHẬN THAM DỰ</button>
    </div>
    <Floral className="reception-floral" />
  </section>;
}

function Venue({ data }) {
  const locations = [
    { key: 'groom-home', label: 'Nhà chú rể', ...data.venue.groomHome },
    { key: 'bride-home', label: 'Nhà cô dâu', ...data.venue.brideHome }
  ];
  return <section id="venue" className="section venue-section">
    <SectionTitle eyebrow="HẸN GẶP QUÝ KHÁCH" title="Địa điểm tư gia" />
    <div className="venue-grid">{locations.map((location) => {
      const mapUrl = location.mapUrl || location.directionsUrl || location.mapEmbedUrl;
      return <article className="location-card" key={location.key}>
        <div className="location-heading"><span>{location.label}</span><h3>{location.name}</h3><p>{location.address}</p></div>
        {mapUrl || location.address ? <div className="location-map"><iframe title={`Bản đồ ${location.label.toLowerCase()}`} src={googleMapsEmbedUrl(location)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div> : <div className="location-map empty"><MapPin /><span>Chưa thêm bản đồ</span></div>}
        {mapUrl && <a className="direction-link" href={mapUrl} target="_blank" rel="noreferrer"><Navigation size={17} /> Chỉ đường</a>}
      </article>;
    })}</div>
  </section>;
}

function DressAndTimeline({ data }) {
  return <section id="timeline" className="section timeline-section">
    <div className="dress-code">
      <SectionTitle title="Dress code" />
      <p>Trang phục dự tiệc</p>
      <div>{data.dressColors.map((color) => <span key={color} style={{ background: color }} />)}</div>
    </div>
    <div className="burgundy-card timeline-card">
      <SectionTitle title="Lịch trình ngày cưới" light />
      <div className="timeline">
        {data.schedule.map((item, index) => <div className="timeline-item" key={`${item.time_label}-${item.title}`}>
          <strong>{item.time_label}</strong><i>{index < data.schedule.length - 1 && <span />}</i><p>{item.title}</p>
        </div>)}
      </div>
      <Floral className="timeline-floral" />
    </div>
  </section>;
}

function Guestbook({ wishes, onSubmit, initialGuestName = '' }) {
  const [form, setForm] = useState({ guestName: initialGuestName, message: '' });
  const [state, setState] = useState({ loading: false, message: '' });
  const submit = async (event) => {
    event.preventDefault(); setState({ loading: true, message: '' });
    try {
      await onSubmit(form); setForm({ guestName: initialGuestName, message: '' }); setState({ loading: false, message: 'Lời chúc đã được gửi. Cảm ơn bạn!' });
    } catch (error) { setState({ loading: false, message: error.message }); }
  };
  return <section id="guestbook" className="section guestbook-section">
    <form className="guestbook-form" onSubmit={submit}>
      <SectionTitle title="Sổ lưu bút" />
      <input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="Nhập tên*" minLength="2" maxLength="100" required />
      <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Nhập lời chúc*" minLength="3" maxLength="500" required />
      <div className="guestbook-actions"><span><Sparkles size={20} /></span><button className="wine-button" disabled={state.loading}><Send size={16} />{state.loading ? 'ĐANG GỬI...' : 'GỬI LỜI CHÚC'}</button></div>
      {state.message && <p className="form-message">{state.message}</p>}
      <Floral className="guestbook-floral" />
    </form>
    <div className="wishes" aria-live="polite">
      {wishes.map((wish) => <article key={wish.id}>
        <div><strong>{wish.guestName}</strong><time>{new Date(wish.createdAt).toLocaleString('vi-VN')}</time></div>
        <p>{wish.message}</p>
      </article>)}
    </div>
  </section>;
}

function GiftSection({ onOpen }) {
  return <section id="gift" className="section gift-section">
    <SectionTitle title="Hộp quà mừng" />
    <button className="gift-envelope" onClick={onOpen} aria-label="Mở hộp quà mừng">
      <span className="gift-card"><Gift size={38} /><b>Hỷ</b></span><i /><em><Heart size={22} /></em>
    </button>
    <button className="gift-open" onClick={onOpen}>Nhấn để mở</button>
    <p>Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!</p>
    <small>♡ hoanglongbaongoc.com</small>
  </section>;
}

function Modal({ title, onClose, children, className = '' }) {
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <button className="modal-close" onClick={onClose} aria-label="Đóng"><X /></button>
      <SectionTitle title={title} />{children}
    </div>
  </div>;
}

function RsvpModal({ onClose, onSubmit, initialGuestName = '' }) {
  const [form, setForm] = useState({ guestName: initialGuestName, phone: '', attendance: 'attending', guestCount: 1, note: '' });
  const [status, setStatus] = useState({ loading: false, message: '', done: false });
  const submit = async (event) => {
    event.preventDefault(); setStatus({ loading: true, message: '', done: false });
    try { const response = await onSubmit(form); setStatus({ loading: false, message: response.message, done: true }); }
    catch (error) { setStatus({ loading: false, message: error.message, done: false }); }
  };
  return <Modal title="Xác nhận tham dự" onClose={onClose}>
    {status.done ? <div className="success-state"><span><Check /></span><p>{status.message}</p><button className="wine-button" onClick={onClose}>HOÀN TẤT</button></div> :
      <form className="rsvp-form" onSubmit={submit}>
        <label>Họ và tên<input required minLength="2" maxLength="100" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} /></label>
        <label>Số điện thoại<input type="tel" maxLength="30" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Bạn sẽ tham dự?<select value={form.attendance} onChange={(e) => setForm({ ...form, attendance: e.target.value })}><option value="attending">Tôi sẽ tham dự</option><option value="maybe">Tôi chưa chắc chắn</option><option value="not_attending">Rất tiếc, tôi không thể tham dự</option></select></label>
        <label>Số khách đi cùng<input type="number" min="1" max="10" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })} /></label>
        <label>Lời nhắn<textarea maxLength="500" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        {status.message && <p className="form-message error">{status.message}</p>}
        <button className="wine-button wide" disabled={status.loading}>{status.loading ? 'ĐANG GỬI...' : 'GỬI XÁC NHẬN'}</button>
      </form>}
  </Modal>;
}

function GiftModal({ gift, onClose }) {
  const [copied, setCopied] = useState('');
  const copy = async (value, label) => { if (!value) return; await navigator.clipboard.writeText(value); setCopied(label); setTimeout(() => setCopied(''), 1600); };
  const accounts = [
    gift.groom || { ...gift, label: 'Chú rể' },
    gift.bride || { label: 'Cô dâu', bankName: '', accountName: '', accountNumber: '', message: '', qrImage: '' }
  ];
  return <Modal title="Mừng cưới từ xa" onClose={onClose} className="gift-modal">
    <div className="gift-bank-grid">{accounts.map((account, index) => {
      const owner = index === 0 ? 'groom' : 'bride';
      return <section className="bank-account" key={owner}>
        <h3>{account.label || (index === 0 ? 'Chú rể' : 'Cô dâu')}</h3>
        <div className={`bank-qr${account.qrImage ? '' : ' empty'}`}>{account.qrImage ? <img src={account.qrImage} alt={`Mã QR ${account.label || owner}`} /> : <><QrCode /><span>Chưa cập nhật mã QR</span></>}</div>
        <div className="bank-card">
          <span>NGÂN HÀNG</span><strong>{account.bankName || 'Chưa cập nhật'}</strong>
          <span>CHỦ TÀI KHOẢN</span><strong>{account.accountName || 'Chưa cập nhật'}</strong>
          <span>SỐ TÀI KHOẢN</span><button disabled={!account.accountNumber} onClick={() => copy(account.accountNumber, `${owner}-account`)}>{account.accountNumber || 'Chưa cập nhật'}{account.accountNumber && (copied === `${owner}-account` ? <Check /> : <Copy />)}</button>
          <span>NỘI DUNG</span><button disabled={!account.message} onClick={() => copy(account.message, `${owner}-message`)}>{account.message || 'Chưa cập nhật'}{account.message && (copied === `${owner}-message` ? <Check /> : <Copy />)}</button>
        </div>
      </section>;
    })}</div>
    <p className="bank-note">Cảm ơn tình cảm và lời chúc của bạn dành cho cô dâu chú rể.</p>
  </Modal>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [invitee, setInvitee] = useState(null);
  const [modal, setModal] = useState(null);
  const [offline, setOffline] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [hasEntered, setHasEntered] = useState(isPreviewMode);

  useEffect(() => {
    if (isPreviewMode) {
      const receivePreview = (event) => {
        if (event.origin !== window.location.origin || event.source !== window.parent) return;
        if (event.data?.type === 'wedding-preview-content' && event.data.content) {
          setData(event.data.content);
        }
        if (event.data?.type === 'wedding-preview-scroll' && event.data.section) {
          document.getElementById(event.data.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      window.addEventListener('message', receivePreview);
      window.parent.postMessage({ type: 'wedding-preview-ready' }, window.location.origin);
      return () => window.removeEventListener('message', receivePreview);
    }
    const inviteeRequest = inviteToken
      ? invitationApi.getInvitee(inviteToken).catch(() => null)
      : Promise.resolve(null);
    Promise.all([invitationApi.getInvitation(), invitationApi.getWishes(), inviteeRequest])
      .then(([invitation, wishList, invitedGuest]) => {
        setData(invitation);
        setWishes(wishList);
        setInvitee(invitedGuest);
      })
      .catch((error) => { if (error.status === 404) setUnavailable(true); else setOffline(true); });
  }, []);

  const createWish = async (payload) => {
    const wish = await invitationApi.createWish(payload);
    setWishes((current) => [wish, ...current]);
  };

  if (unavailable) return <main className="invitation-unavailable">
    <div><span>THIỆP CƯỚI</span><h1>Thiệp đang được cập nhật</h1><p>Cô dâu và chú rể đang chuẩn bị những chi tiết cuối cùng. Mời bạn quay lại sau nhé!</p></div>
  </main>;

  if (!data) return <main className="invitation-unavailable">
    <div>
      <span>THIỆP CƯỚI</span>
      <h1>{offline ? 'Chưa thể tải dữ liệu' : 'Đang tải thiệp cưới...'}</h1>
      <p>{offline ? 'Vui lòng kiểm tra kết nối tới API và thử tải lại trang.' : 'Vui lòng chờ trong giây lát.'}</p>
    </div>
  </main>;

  return <>
    {!hasEntered && <EntryGate data={data} inviteeName={invitee?.name} onOpened={() => { setHasEntered(true); window.scrollTo({ top: 0, behavior: 'instant' }); }} />}
    <main className={!hasEntered ? 'invitation-behind-gate' : ''}>
    {isPreviewMode && <div className="preview-ribbon">Bản xem trước · Chưa lưu</div>}
    <Hero data={data} />
    <InvitationCard data={data} />
    <Gallery data={data} />
    <Reception data={data} onRsvp={() => setModal('rsvp')} />
    <Venue data={data} />
    <DressAndTimeline data={data} />
    <Guestbook wishes={wishes} onSubmit={createWish} initialGuestName={invitee?.name} />
    <GiftSection onOpen={() => setModal('gift')} />
    {modal === 'rsvp' && <RsvpModal onClose={() => setModal(null)} onSubmit={invitationApi.createRsvp} initialGuestName={invitee?.name} />}
    {modal === 'gift' && <GiftModal gift={data.gift} onClose={() => setModal(null)} />}
    </main>
  </>;
}
