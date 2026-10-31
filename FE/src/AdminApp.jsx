import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, CalendarDays, Check, ChevronRight, Copy, Eye, EyeOff,
  Expand, Gift, Image, LayoutDashboard, Link2, LocateFixed, LogOut, MapPin,
  MessageSquare, MonitorSmartphone, Music2, Plus, Save, Settings, Shrink,
  Trash2, Type, UploadCloud, UserPlus, Users, X
} from 'lucide-react';
import { adminApi } from './api.js';
import { formatVietnameseLunarDate } from './lunarDate.js';
import { FONT_OPTIONS, INVITATION_PART_DEFAULTS, INVITATION_PARTS, TYPOGRAPHY_DEFAULTS, TYPOGRAPHY_SECTIONS, normalizeTypography } from './typography.js';
import './admin.css';

const tokenKey = 'wedding-admin-token';
const normalizeInvitationGift = (invitation) => {
  const gift = invitation.gift || {};
  const account = (source, label) => ({ label, bankName: '', accountName: '', accountNumber: '', message: '', qrImage: '', ...(source || {}) });
  return {
    ...invitation,
    music: { url: '', title: '', enabled: false, volume: 0.35, ...(invitation.music || {}) },
    typography: normalizeTypography(invitation.typography),
    gift: {
      groom: account(gift.groom || gift, 'Chú rể'),
      bride: account(gift.bride, 'Cô dâu')
    }
  };
};
const sections = [
  ['overview', <LayoutDashboard size={18} />, 'Tổng quan'],
  ['couple', <Settings size={18} />, 'Thông tin thiệp'],
  ['typography', <Type size={18} />, 'Kiểu chữ'],
  ['families', <Users size={18} />, 'Hai gia đình'],
  ['venue', <MapPin size={18} />, 'Địa điểm'],
  ['gallery', <Image size={18} />, 'Album ảnh'],
  ['schedule', <CalendarDays size={18} />, 'Lịch trình'],
  ['gift', <Gift size={18} />, 'Quà mừng'],
  ['music', <Music2 size={18} />, 'Nhạc nền'],
  ['invitees', <Link2 size={18} />, 'Link khách mời'],
  ['submissions', <MessageSquare size={18} />, 'Phản hồi']
];

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ loading: false, message: '' });
  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, message: '' });
    try {
      await onLogin(username, password);
    } catch (error) {
      setState({ loading: false, message: error.message });
    }
  };
  return <main className="admin-login-shell">
    <form className="admin-login" onSubmit={submit}>
      <div className="admin-mark">HL <span>&amp;</span> BN</div>
      <p className="admin-kicker">Wedding invitation</p>
      <h1>Trang quản trị</h1>
      <p>Đăng nhập để chỉnh nội dung thiệp và quản lý phản hồi của khách mời.</p>
      <label>Tên đăng nhập
        <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus required />
      </label>
      <label>Mật khẩu quản trị
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
      </label>
      {state.message && <div className="admin-alert error">{state.message}</div>}
      <button className="admin-primary" disabled={state.loading}>{state.loading ? 'Đang đăng nhập...' : 'Đăng nhập'}<ChevronRight size={18} /></button>
      <a href="/">← Quay lại thiệp cưới</a>
    </form>
  </main>;
}

function Panel({ id, eyebrow, title, previewSection, onPreview, children }) {
  return <section className="admin-panel" id={id}>
    <header><div><span>{eyebrow}</span><h2>{title}</h2></div>
      {previewSection && <button type="button" className="admin-locate" onClick={() => onPreview(previewSection)}><LocateFixed size={15} /> Xem vị trí</button>}
    </header>
    {children}
  </section>;
}

function Field({ label, children, wide = false }) {
  return <label className={wide ? 'admin-field wide' : 'admin-field'}><span>{label}</span>{children}</label>;
}

function RowActions({ index, length, onMove, onRemove }) {
  return <div className="admin-row-actions">
    <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="Đưa lên"><ArrowUp size={16} /></button>
    <button type="button" onClick={() => onMove(index, 1)} disabled={index === length - 1} aria-label="Đưa xuống"><ArrowDown size={16} /></button>
    <button type="button" className="danger" onClick={() => onRemove(index)} aria-label="Xóa"><Trash2 size={16} /></button>
  </div>;
}

export default function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || '');
  const [data, setData] = useState(null);
  const [submissions, setSubmissions] = useState({ wishes: [], rsvps: [] });
  const [invitees, setInvitees] = useState([]);
  const [newInviteeName, setNewInviteeName] = useState('');
  const [inviteeBusy, setInviteeBusy] = useState('');
  const [copiedInvitee, setCopiedInvitee] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [notice, setNotice] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState('hero');
  const previewRef = useRef(null);

  const logout = () => {
    sessionStorage.removeItem(tokenKey);
    setToken('');
    setData(null);
    setInvitees([]);
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([adminApi.getInvitation(token), adminApi.getSubmissions(token), adminApi.getInvitees(token)])
      .then(([invitation, response, inviteeList]) => {
        setData(normalizeInvitationGift(invitation));
        setSubmissions(response);
        setInvitees(inviteeList);
      })
      .catch((error) => { if (error.status === 401) logout(); else setNotice(error.message); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (username, password) => {
    const response = await adminApi.login(username, password);
    sessionStorage.setItem(tokenKey, response.token);
    setToken(response.token);
  };

  const sendPreview = useCallback((content) => {
    previewRef.current?.contentWindow?.postMessage(
      { type: 'wedding-preview-content', content },
      window.location.origin
    );
  }, []);

  const scrollPreview = useCallback((section) => {
    previewRef.current?.contentWindow?.postMessage(
      { type: 'wedding-preview-scroll', section },
      window.location.origin
    );
  }, []);

  useEffect(() => {
    if (data && previewOpen) sendPreview(data);
  }, [data, previewOpen, sendPreview]);

  useEffect(() => {
    const receivePreviewMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== previewRef.current?.contentWindow) return;
      if (event.data?.type === 'wedding-preview-ready' && data) {
        sendPreview(data);
        scrollPreview(previewTarget);
      }
    };
    window.addEventListener('message', receivePreviewMessage);
    return () => window.removeEventListener('message', receivePreviewMessage);
  }, [data, previewTarget, scrollPreview, sendPreview]);

  useEffect(() => {
    if (!previewFullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [previewFullscreen]);

  const showPreviewSection = (section) => {
    setPreviewTarget(section);
    setPreviewOpen(true);
    window.setTimeout(() => { sendPreview(data); scrollPreview(section); }, 120);
  };

  const updateRoot = (key, value) => setData((current) => ({ ...current, [key]: value }));
  const updateWeddingDate = (value) => setData((current) => ({
    ...current,
    weddingDate: value,
    lunarDate: formatVietnameseLunarDate(value)
  }));
  const updateGiftAccount = (owner, key, value) => setData((current) => ({
    ...current,
    gift: { ...current.gift, [owner]: { ...current.gift[owner], [key]: value } }
  }));
  const updateMusic = (key, value) => setData((current) => ({
    ...current,
    music: { ...current.music, [key]: value }
  }));
  const updateTypography = (section, key, value) => setData((current) => ({
    ...current,
    typography: {
      ...current.typography,
      [section]: { ...current.typography[section], [key]: value }
    }
  }));
  const resetTypography = (section) => setData((current) => ({
    ...current,
    typography: { ...current.typography, [section]: normalizeTypography({ [section]: TYPOGRAPHY_DEFAULTS[section] })[section] }
  }));
  const updateInvitationPart = (part, key, value) => setData((current) => ({
    ...current,
    typography: {
      ...current.typography,
      invitation: {
        ...current.typography.invitation,
        parts: {
          ...current.typography.invitation.parts,
          [part]: { ...current.typography.invitation.parts[part], [key]: value }
        }
      }
    }
  }));
  const resetInvitationPart = (part) => setData((current) => ({
    ...current,
    typography: {
      ...current.typography,
      invitation: {
        ...current.typography.invitation,
        parts: { ...current.typography.invitation.parts, [part]: { ...INVITATION_PART_DEFAULTS[part] } }
      }
    }
  }));
  const updateVenueLocation = (location, key, value) => setData((current) => ({
    ...current,
    venue: { ...current.venue, [location]: { ...current.venue[location], [key]: value } }
  }));
  const updateItem = (group, index, key, value) => setData((current) => ({
    ...current,
    [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)
  }));
  const removeItem = (group, index) => setData((current) => ({ ...current, [group]: current[group].filter((_, itemIndex) => itemIndex !== index) }));
  const moveItem = (group, index, direction) => setData((current) => {
    const next = [...current[group]];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, [group]: next };
  });

  const save = async () => {
    setSaving(true); setNotice('');
    try {
      const response = await adminApi.updateInvitation(token, data);
      setData(normalizeInvitationGift(response.invitation));
      setNotice(response.message);
    } catch (error) {
      if (error.status === 401) logout();
      else setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file, target, applyImage) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setNotice('Ảnh không được lớn hơn 8 MB.');
      return;
    }
    setUploading(target); setNotice('');
    try {
      const response = await adminApi.uploadImage(token, file);
      applyImage(response.imageUrl);
      setNotice('Đã tải ảnh lên. Hãy nhấn “Lưu thay đổi” để áp dụng vào thiệp.');
    } catch (error) {
      if (error.status === 401) logout();
      else setNotice(error.message);
    } finally {
      setUploading('');
    }
  };

  const uploadAudio = async (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setNotice('Tệp nhạc không được lớn hơn 25 MB.');
      return;
    }
    setUploading('music'); setNotice('');
    try {
      const response = await adminApi.uploadAudio(token, file);
      setData((current) => ({
        ...current,
        music: {
          ...current.music,
          url: response.audioUrl,
          title: current.music.title || file.name.replace(/\.[^.]+$/, '')
        }
      }));
      setNotice('Đã tải nhạc lên. Hãy nhấn “Lưu thay đổi” để áp dụng vào thiệp.');
    } catch (error) {
      if (error.status === 401) logout();
      else setNotice(error.message);
    } finally {
      setUploading('');
    }
  };

  const toggleWish = async (wish) => {
    try {
      await adminApi.updateWish(token, wish.id, !wish.isVisible);
      setSubmissions((current) => ({
        ...current,
        wishes: current.wishes.map((item) => item.id === wish.id ? { ...item, isVisible: !item.isVisible } : item)
      }));
    } catch (error) { setNotice(error.message); }
  };

  const deleteWish = async (wish) => {
    if (!window.confirm(`Xóa lời chúc của ${wish.guestName}?`)) return;
    try {
      await adminApi.deleteWish(token, wish.id);
      setSubmissions((current) => ({ ...current, wishes: current.wishes.filter((item) => item.id !== wish.id) }));
      setNotice('Đã xóa lời chúc.');
    } catch (error) { setNotice(error.message); }
  };

  const inviteeLink = (inviteeToken) => {
    const url = new URL(import.meta.env.BASE_URL, window.location.origin);
    url.searchParams.set('invite', inviteeToken);
    return url.toString();
  };

  const createInvitee = async (event) => {
    event.preventDefault();
    const name = newInviteeName.trim();
    if (!name) return;
    setInviteeBusy('create'); setNotice('');
    try {
      const invitee = await adminApi.createInvitee(token, name);
      setInvitees((current) => [invitee, ...current]);
      setNewInviteeName('');
      setNotice(`Đã tạo link mời cho ${invitee.name}.`);
    } catch (error) {
      if (error.status === 401) logout();
      else setNotice(error.message);
    } finally {
      setInviteeBusy('');
    }
  };

  const editInviteeName = (id, name) => setInvitees((current) => (
    current.map((item) => item.id === id ? { ...item, name } : item)
  ));

  const saveInvitee = async (invitee, changes = {}) => {
    const nextInvitee = { ...invitee, ...changes };
    setInviteeBusy(invitee.id); setNotice('');
    try {
      const response = await adminApi.updateInvitee(token, nextInvitee);
      setInvitees((current) => current.map((item) => item.id === invitee.id ? response.invitee : item));
      setNotice(response.message);
    } catch (error) {
      if (error.status === 401) logout();
      else setNotice(error.message);
    } finally {
      setInviteeBusy('');
    }
  };

  const copyInviteeLink = async (invitee) => {
    try {
      await navigator.clipboard.writeText(inviteeLink(invitee.token));
      setCopiedInvitee(invitee.id);
      setNotice(`Đã sao chép link mời của ${invitee.name}.`);
      window.setTimeout(() => setCopiedInvitee(null), 1800);
    } catch {
      setNotice('Không thể sao chép tự động. Hãy chọn và sao chép đường link thủ công.');
    }
  };

  const deleteInvitee = async (invitee) => {
    if (!window.confirm(`Xóa link mời của ${invitee.name}? Link này sẽ không dùng được nữa.`)) return;
    setInviteeBusy(invitee.id); setNotice('');
    try {
      const response = await adminApi.deleteInvitee(token, invitee.id);
      setInvitees((current) => current.filter((item) => item.id !== invitee.id));
      setNotice(response.message);
    } catch (error) {
      if (error.status === 401) logout();
      else setNotice(error.message);
    } finally {
      setInviteeBusy('');
    }
  };

  const stats = useMemo(() => {
    const attending = submissions.rsvps.filter((item) => item.attendance === 'attending');
    return {
      rsvps: submissions.rsvps.length,
      guests: attending.reduce((total, item) => total + Number(item.guestCount || 0), 0),
      wishes: submissions.wishes.length
    };
  }, [submissions]);

  if (!token) return <Login onLogin={login} />;
  if (loading || !data) return <main className="admin-loading"><div className="admin-spinner" /><p>Đang tải trang quản trị...</p></main>;

  return <div className={`admin-shell${previewOpen ? ' preview-open' : ''}`}>
    <aside className="admin-sidebar">
      <a className="admin-brand" href="#overview"><strong>HL <i>&amp;</i> BN</strong><span>Invitation studio</span></a>
      <nav>{sections.map(([id, icon, label]) => <a key={id} href={`#${id}`}>{icon}<span>{label}</span></a>)}</nav>
      <button onClick={logout}><LogOut size={18} /> Đăng xuất</button>
    </aside>

    <main className="admin-main">
      <header className="admin-topbar">
        <div><p>Trang quản trị</p><h1>{data.groomName} <i>&amp;</i> {data.brideName}</h1></div>
        <div className="admin-top-actions">
          <button className="admin-preview-toggle" onClick={() => setPreviewOpen((current) => !current)}><MonitorSmartphone size={17} />{previewOpen ? 'Ẩn xem trước' : 'Hiện xem trước'}</button>
          <a href="/" target="_blank" rel="noreferrer"><Eye size={17} /> Xem thiệp</a>
          <button className="admin-primary" onClick={save} disabled={saving}><Save size={17} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </div>
      </header>

      {notice && <button className="admin-notice" onClick={() => setNotice('')}><Check size={17} />{notice}</button>}

      <Panel id="overview" eyebrow="Dashboard" title="Tổng quan thiệp cưới" previewSection="hero" onPreview={showPreviewSection}>
        <div className="admin-stats">
          <article><span><Users /></span><div><strong>{stats.rsvps}</strong><p>Phản hồi RSVP</p></div></article>
          <article><span><Check /></span><div><strong>{stats.guests}</strong><p>Khách xác nhận</p></div></article>
          <article><span><MessageSquare /></span><div><strong>{stats.wishes}</strong><p>Lời chúc</p></div></article>
          <article><span><Image /></span><div><strong>{data.gallery.length}</strong><p>Ảnh trong album</p></div></article>
        </div>
        <label className="publish-toggle"><input type="checkbox" checked={data.isPublished !== false} onChange={(event) => updateRoot('isPublished', event.target.checked)} /><span />
          <div><strong>Xuất bản thiệp</strong><small>Tắt để tạm ẩn thiệp khỏi khách mời.</small></div>
        </label>
      </Panel>

      <Panel id="couple" eyebrow="Nội dung chính" title="Thông tin cô dâu chú rể" previewSection="hero" onPreview={showPreviewSection}>
        <div className="admin-form-grid">
          <Field label="Tên chú rể"><input value={data.groomName} onChange={(event) => updateRoot('groomName', event.target.value)} /></Field>
          <Field label="Tên cô dâu"><input value={data.brideName} onChange={(event) => updateRoot('brideName', event.target.value)} /></Field>
          <Field label="Vai trò chú rể"><input value={data.groomRole || ''} onChange={(event) => updateRoot('groomRole', event.target.value)} placeholder="Ví dụ: TRƯỞNG NAM" /></Field>
          <Field label="Vai trò cô dâu"><input value={data.brideRole || ''} onChange={(event) => updateRoot('brideRole', event.target.value)} placeholder="Ví dụ: ÚT NỮ" /></Field>
          <Field label="Dòng tiêu đề" wide><input value={data.tagline || ''} onChange={(event) => updateRoot('tagline', event.target.value)} /></Field>
          <Field label="Tiêu đề khung thông tin" wide><input value={data.invitationHeading || ''} onChange={(event) => updateRoot('invitationHeading', event.target.value)} placeholder="Thông tin lễ cưới" /></Field>
          <Field label="Lời báo tin" wide><textarea value={data.announcementText || ''} onChange={(event) => updateRoot('announcementText', event.target.value)} placeholder={'TRÂN TRỌNG BÁO TIN\nLỄ THÀNH HÔN CỦA CON CHÚNG TÔI'} /></Field>
          <Field label="Ngày cưới"><input type="date" value={String(data.weddingDate).slice(0, 10)} onChange={(event) => updateWeddingDate(event.target.value)} /></Field>
          <Field label="Giờ làm lễ"><input type="time" value={String(data.ceremonyTime).slice(0, 5)} onChange={(event) => updateRoot('ceremonyTime', event.target.value)} /></Field>
          <Field label="Giờ đón khách"><input type="time" value={String(data.receptionGuestTime).slice(0, 5)} onChange={(event) => updateRoot('receptionGuestTime', event.target.value)} /></Field>
          <Field label="Giờ khai tiệc"><input type="time" value={String(data.receptionTime).slice(0, 5)} onChange={(event) => updateRoot('receptionTime', event.target.value)} /></Field>
          <Field label="Ngày âm lịch" wide><input value={data.lunarDate || ''} onChange={(event) => updateRoot('lunarDate', event.target.value)} /><small className="admin-field-hint">Tự động tính theo âm lịch Việt Nam (UTC+7), có xử lý tháng nhuận và Can Chi. Bạn vẫn có thể chỉnh tay.</small></Field>
          <Field label="Dòng giới thiệu nơi cử hành" wide><input value={data.ceremonyIntro || ''} onChange={(event) => updateRoot('ceremonyIntro', event.target.value)} /></Field>
          <Field label="Nơi cử hành" wide><input value={data.ceremonyVenue || ''} onChange={(event) => updateRoot('ceremonyVenue', event.target.value)} placeholder="TƯ GIA" /></Field>
          <Field label="Ảnh bìa" wide><div className="admin-image-control">
            <input value={data.heroImage || ''} onChange={(event) => updateRoot('heroImage', event.target.value)} placeholder="Đường dẫn hoặc URL ảnh" />
            <label className={`admin-upload${uploading === 'hero' ? ' loading' : ''}`}><UploadCloud size={17} />{uploading === 'hero' ? 'Đang tải...' : 'Chọn ảnh từ máy'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(uploading)} onChange={(event) => { uploadImage(event.target.files?.[0], 'hero', (imageUrl) => updateRoot('heroImage', imageUrl)); event.target.value = ''; }} />
            </label>
          </div></Field>
        </div>
        {data.heroImage && <div className="admin-hero-preview"><img src={data.heroImage} alt="Xem trước ảnh bìa" /><span>Xem trước ảnh bìa</span></div>}
      </Panel>

      <Panel id="typography" eyebrow="Typography" title="Kiểu chữ theo từng phần">
        <p className="admin-panel-description">Chọn font riêng cho tiêu đề và nội dung của từng khu vực. Thay đổi được cập nhật ngay trong khung xem trước và chỉ lưu khi bạn bấm “Lưu thay đổi”.</p>
        <div className="admin-typography-grid">{TYPOGRAPHY_SECTIONS.map((section) => {
          const setting = data.typography[section.id];
          const headingFont = FONT_OPTIONS.find((font) => font.id === setting.headingFont) || FONT_OPTIONS[0];
          const bodyFont = FONT_OPTIONS.find((font) => font.id === setting.bodyFont) || FONT_OPTIONS[0];
          return <article className="admin-typography-card" key={section.id}>
            <header><div><span>Phần thiệp</span><h3>{section.label}</h3></div><button type="button" onClick={() => showPreviewSection(section.preview)}><LocateFixed size={14} /> Xem phần này</button></header>
            <div className="admin-font-sample">
              <strong style={{ fontFamily: headingFont.stack, fontSize: `${Math.min(setting.headingSize, 38)}px`, fontWeight: setting.headingWeight, fontStyle: setting.headingItalic ? 'italic' : 'normal' }}>Ngày chung đôi</strong>
              <span style={{ fontFamily: bodyFont.stack, fontSize: `${setting.bodySize}px` }}>Trân trọng kính mời quý khách đến chung vui cùng gia đình.</span>
            </div>
            <div className="admin-form-grid admin-typography-form">
              <Field label="Font tiêu đề"><select value={setting.headingFont} onChange={(event) => updateTypography(section.id, 'headingFont', event.target.value)}>{FONT_OPTIONS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}</select></Field>
              <Field label="Font nội dung"><select value={setting.bodyFont} onChange={(event) => updateTypography(section.id, 'bodyFont', event.target.value)}>{FONT_OPTIONS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}</select></Field>
              <Field label={`Cỡ tiêu đề: ${setting.headingSize}px`}><input type="range" min="18" max="80" step="1" value={setting.headingSize} onChange={(event) => updateTypography(section.id, 'headingSize', Number(event.target.value))} /></Field>
              <Field label={`Cỡ nội dung: ${setting.bodySize}px`}><input type="range" min="10" max="22" step="1" value={setting.bodySize} onChange={(event) => updateTypography(section.id, 'bodySize', Number(event.target.value))} /></Field>
              <Field label="Độ đậm tiêu đề"><select value={setting.headingWeight} onChange={(event) => updateTypography(section.id, 'headingWeight', Number(event.target.value))}><option value="400">Mảnh</option><option value="500">Vừa</option><option value="600">Đậm vừa</option><option value="700">Đậm</option></select></Field>
              <label className="admin-font-italic"><input type="checkbox" checked={setting.headingItalic} onChange={(event) => updateTypography(section.id, 'headingItalic', event.target.checked)} /><span /> Chữ nghiêng</label>
            </div>
            <button type="button" className="admin-font-reset" onClick={() => resetTypography(section.id)}>Khôi phục mặc định</button>
          </article>;
        })}</div>
        <section className="admin-invitation-typography">
          <header><div><span>Chi tiết nâng cao</span><h3>Chữ bên trong khung “Thông tin lễ cưới”</h3></div><button type="button" onClick={() => showPreviewSection('invitation')}><LocateFixed size={14} /> Xem khung lễ cưới</button></header>
          <p>Tiêu đề khung dùng thiết lập “Thông tin lễ cưới” ở phía trên. Sáu nhóm dưới đây điều khiển độc lập từng nội dung còn lại.</p>
          <div className="admin-invitation-part-grid">{INVITATION_PARTS.map((part) => {
            const setting = data.typography.invitation.parts[part.id];
            const selectedFont = FONT_OPTIONS.find((font) => font.id === setting.font) || FONT_OPTIONS[0];
            return <article key={part.id}>
              <h4>{part.label}</h4>
              <div className="admin-part-sample" style={{ fontFamily: selectedFont.stack, fontSize: `${Math.min(setting.size, 30)}px`, fontWeight: setting.weight, fontStyle: setting.italic ? 'italic' : 'normal' }}>{part.sample}</div>
              <div className="admin-form-grid admin-part-form">
                <Field label="Kiểu chữ" wide><select value={setting.font} onChange={(event) => updateInvitationPart(part.id, 'font', event.target.value)}>{FONT_OPTIONS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}</select></Field>
                <Field label={`Cỡ chữ: ${setting.size}px`}><input type="range" min="8" max="80" step="1" value={setting.size} onChange={(event) => updateInvitationPart(part.id, 'size', Number(event.target.value))} /></Field>
                <Field label="Độ đậm"><select value={setting.weight} onChange={(event) => updateInvitationPart(part.id, 'weight', Number(event.target.value))}><option value="400">Mảnh</option><option value="500">Vừa</option><option value="600">Đậm vừa</option><option value="700">Đậm</option></select></Field>
                <label className="admin-font-italic"><input type="checkbox" checked={setting.italic} onChange={(event) => updateInvitationPart(part.id, 'italic', event.target.checked)} /><span /> Chữ nghiêng</label>
              </div>
              <button type="button" className="admin-font-reset" onClick={() => resetInvitationPart(part.id)}>Khôi phục nhóm này</button>
            </article>;
          })}</div>
        </section>
      </Panel>

      <Panel id="families" eyebrow="Lễ thành hôn" title="Thông tin hai gia đình" previewSection="invitation" onPreview={showPreviewSection}>
        <div className="admin-family-grid">{data.families.map((family, index) => <article key={family.side}>
          <h3>{family.side === 'groom' ? 'Nhà trai' : 'Nhà gái'}</h3>
          <Field label="Cách xưng hô"><input value={family.parent_label || ''} onChange={(event) => updateItem('families', index, 'parent_label', event.target.value)} /></Field>
          <Field label="Tên cha"><input value={family.father_name || ''} onChange={(event) => updateItem('families', index, 'father_name', event.target.value)} /></Field>
          <Field label="Tên mẹ"><input value={family.mother_name || ''} onChange={(event) => updateItem('families', index, 'mother_name', event.target.value)} /></Field>
          <Field label="Địa chỉ"><textarea value={family.address || ''} onChange={(event) => updateItem('families', index, 'address', event.target.value)} /></Field>
        </article>)}</div>
      </Panel>

      <Panel id="venue" eyebrow="Bản đồ & chỉ đường" title="Địa điểm nhà trai & nhà gái" previewSection="venue" onPreview={showPreviewSection}>
        <div className="admin-location-editors">
          <article><h3><span>01</span> Nhà chú rể</h3><div className="admin-form-grid">
            <Field label="Tên địa điểm" wide><input value={data.venue.groomHome?.name || ''} onChange={(event) => updateVenueLocation('groomHome', 'name', event.target.value)} /></Field>
            <Field label="Địa chỉ" wide><textarea value={data.venue.groomHome?.address || ''} onChange={(event) => updateVenueLocation('groomHome', 'address', event.target.value)} /></Field>
            <Field label="URL Google Maps" wide><input value={data.venue.groomHome?.mapUrl || data.venue.groomHome?.directionsUrl || ''} onChange={(event) => updateVenueLocation('groomHome', 'mapUrl', event.target.value)} placeholder="Dán link Google Maps hoặc maps.app.goo.gl" /><small className="admin-field-hint">Chỉ cần nhập một lần. Hệ thống tự dùng cho bản đồ nhúng và nút chỉ đường.</small></Field>
          </div></article>
          <article><h3><span>02</span> Nhà cô dâu</h3><div className="admin-form-grid">
            <Field label="Tên địa điểm" wide><input value={data.venue.brideHome?.name || ''} onChange={(event) => updateVenueLocation('brideHome', 'name', event.target.value)} /></Field>
            <Field label="Địa chỉ" wide><textarea value={data.venue.brideHome?.address || ''} onChange={(event) => updateVenueLocation('brideHome', 'address', event.target.value)} /></Field>
            <Field label="URL Google Maps" wide><input value={data.venue.brideHome?.mapUrl || data.venue.brideHome?.directionsUrl || ''} onChange={(event) => updateVenueLocation('brideHome', 'mapUrl', event.target.value)} placeholder="Dán link Google Maps hoặc maps.app.goo.gl" /><small className="admin-field-hint">Chỉ cần nhập một lần. Hệ thống tự dùng cho bản đồ nhúng và nút chỉ đường.</small></Field>
          </div></article>
        </div>
      </Panel>

      <Panel id="gallery" eyebrow="Hình ảnh" title="Album ảnh cưới" previewSection="gallery" onPreview={showPreviewSection}>
        <div className="admin-repeat-list">{data.gallery.map((image, index) => <article className="admin-image-row" key={image.id || index}>
          <div className="admin-thumb">{image.image_url ? <img src={image.image_url} alt="" /> : <Image />}</div>
          <div className="admin-row-fields">
            <Field label={`Ảnh ${index + 1}`}><div className="admin-image-control compact">
              <input value={image.image_url || ''} onChange={(event) => updateItem('gallery', index, 'image_url', event.target.value)} placeholder="Đường dẫn hoặc URL ảnh" />
              <label className={`admin-upload${uploading === `gallery-${index}` ? ' loading' : ''}`}><UploadCloud size={15} />{uploading === `gallery-${index}` ? 'Đang tải...' : 'Tải ảnh'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(uploading)} onChange={(event) => { uploadImage(event.target.files?.[0], `gallery-${index}`, (imageUrl) => updateItem('gallery', index, 'image_url', imageUrl)); event.target.value = ''; }} />
              </label>
            </div></Field>
            <Field label="Mô tả ảnh"><input value={image.alt_text || ''} onChange={(event) => updateItem('gallery', index, 'alt_text', event.target.value)} /></Field>
          </div>
          <RowActions index={index} length={data.gallery.length} onMove={(itemIndex, direction) => moveItem('gallery', itemIndex, direction)} onRemove={(itemIndex) => removeItem('gallery', itemIndex)} />
        </article>)}</div>
        <button type="button" className="admin-add" onClick={() => updateRoot('gallery', [...data.gallery, { image_url: '', alt_text: '' }])}><Plus size={17} /> Thêm ảnh</button>
      </Panel>

      <Panel id="schedule" eyebrow="Ngày trọng đại" title="Lịch trình ngày cưới" previewSection="timeline" onPreview={showPreviewSection}>
        <div className="admin-repeat-list">{data.schedule.map((item, index) => <article className="admin-schedule-row" key={`${item.time_label}-${index}`}>
          <Field label="Thời gian"><input type="time" value={String(item.time_label).slice(0, 5)} onChange={(event) => updateItem('schedule', index, 'time_label', event.target.value)} /></Field>
          <Field label="Nội dung"><input value={item.title || ''} onChange={(event) => updateItem('schedule', index, 'title', event.target.value)} /></Field>
          <Field label="Biểu tượng"><select value={item.icon || 'heart'} onChange={(event) => updateItem('schedule', index, 'icon', event.target.value)}><option value="heart">Trái tim</option><option value="camera">Máy ảnh</option><option value="glass">Nâng ly</option><option value="rings">Nhẫn cưới</option><option value="cake">Bánh cưới</option></select></Field>
          <RowActions index={index} length={data.schedule.length} onMove={(itemIndex, direction) => moveItem('schedule', itemIndex, direction)} onRemove={(itemIndex) => removeItem('schedule', itemIndex)} />
        </article>)}</div>
        <button type="button" className="admin-add" onClick={() => updateRoot('schedule', [...data.schedule, { time_label: '18:00', title: '', icon: 'heart' }])}><Plus size={17} /> Thêm mốc thời gian</button>
      </Panel>

      <Panel id="gift" eyebrow="Ngân hàng" title="Quà mừng" previewSection="gift" onPreview={showPreviewSection}>
        <div className="admin-gift-accounts">{[
          ['groom', 'Chú rể'], ['bride', 'Cô dâu']
        ].map(([owner, title]) => {
          const account = data.gift[owner];
          return <article key={owner}><h3>{title}</h3>
            <div className="admin-qr-editor">
              <div className="admin-qr-preview">{account.qrImage ? <img src={account.qrImage} alt={`Mã QR ${title.toLowerCase()}`} /> : <><Image size={28} /><span>Chưa có mã QR</span></>}</div>
              <div><label className={`admin-upload${uploading === `qr-${owner}` ? ' loading' : ''}`}><UploadCloud size={15} />{uploading === `qr-${owner}` ? 'Đang tải...' : 'Tải ảnh QR'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(uploading)} onChange={(event) => { uploadImage(event.target.files?.[0], `qr-${owner}`, (imageUrl) => updateGiftAccount(owner, 'qrImage', imageUrl)); event.target.value = ''; }} />
              </label>
                {account.qrImage && <button type="button" className="admin-remove-qr" onClick={() => updateGiftAccount(owner, 'qrImage', '')}><Trash2 size={14} /> Xóa ảnh QR</button>}
              </div>
            </div>
            <div className="admin-form-grid admin-gift-form">
              <Field label="Ngân hàng"><input value={account.bankName || ''} onChange={(event) => updateGiftAccount(owner, 'bankName', event.target.value)} /></Field>
              <Field label="Chủ tài khoản"><input value={account.accountName || ''} onChange={(event) => updateGiftAccount(owner, 'accountName', event.target.value)} /></Field>
              <Field label="Số tài khoản"><input value={account.accountNumber || ''} onChange={(event) => updateGiftAccount(owner, 'accountNumber', event.target.value)} /></Field>
              <Field label="Nội dung chuyển khoản"><input value={account.message || ''} onChange={(event) => updateGiftAccount(owner, 'message', event.target.value)} /></Field>
            </div>
          </article>;
        })}</div>
      </Panel>

      <Panel id="music" eyebrow="Không gian cảm xúc" title="Nhạc nền cho thiệp">
        <label className="publish-toggle"><input type="checkbox" checked={data.music.enabled} onChange={(event) => updateMusic('enabled', event.target.checked)} /><span />
          <div><strong>Bật nhạc nền</strong><small>Nhạc bắt đầu sau khi khách bấm “Mở thiệp” và tự động phát lặp.</small></div>
        </label>
        <div className="admin-form-grid admin-music-form">
          <Field label="Tên bài nhạc"><input value={data.music.title || ''} onChange={(event) => updateMusic('title', event.target.value)} placeholder="Ví dụ: Bản nhạc của chúng mình" maxLength={150} /></Field>
          <Field label="Âm lượng"><div className="admin-volume-control"><input type="range" min="0" max="100" step="1" value={Math.round(Number(data.music.volume || 0) * 100)} onChange={(event) => updateMusic('volume', Number(event.target.value) / 100)} /><strong>{Math.round(Number(data.music.volume || 0) * 100)}%</strong></div></Field>
          <Field label="URL hoặc tệp nhạc" wide><div className="admin-image-control">
            <input value={data.music.url || ''} onChange={(event) => updateMusic('url', event.target.value)} placeholder="https://.../bai-hat.mp3" />
            <label className={`admin-upload${uploading === 'music' ? ' loading' : ''}`}><UploadCloud size={17} />{uploading === 'music' ? 'Đang tải nhạc...' : 'Chọn nhạc từ máy'}
              <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/ogg,.mp3,.m4a,.wav,.ogg" disabled={Boolean(uploading)} onChange={(event) => { uploadAudio(event.target.files?.[0]); event.target.value = ''; }} />
            </label>
          </div><small className="admin-field-hint">Hỗ trợ MP3, M4A, WAV, OGG; tối đa 25 MB. Nên dùng MP3 dung lượng nhỏ để thiệp tải nhanh.</small></Field>
        </div>
        {data.music.url ? <div className="admin-music-preview"><span><Music2 size={22} /></span><div><strong>{data.music.title || 'Nhạc nền thiệp cưới'}</strong><audio controls preload="metadata" src={data.music.url} /></div><button type="button" onClick={() => updateMusic('url', '')}><Trash2 size={15} /> Xóa nhạc</button></div> : <div className="admin-music-empty"><Music2 size={26} /><span>Chưa chọn nhạc nền</span></div>}
      </Panel>

      <Panel id="invitees" eyebrow="Cá nhân hóa lời mời" title="Link riêng cho từng khách mời">
        <p className="admin-panel-description">Nhập tên khách để tạo đường link riêng. Khi mở link, khách sẽ thấy tên của mình trên màn hình mở thiệp.</p>
        <form className="admin-invitee-create" onSubmit={createInvitee}>
          <Field label="Tên người được mời"><input value={newInviteeName} onChange={(event) => setNewInviteeName(event.target.value)} placeholder="Ví dụ: Anh Nguyễn Văn An và gia đình" maxLength={150} /></Field>
          <button type="submit" className="admin-primary" disabled={inviteeBusy === 'create' || !newInviteeName.trim()}><UserPlus size={17} />{inviteeBusy === 'create' ? 'Đang tạo...' : 'Tạo link mời'}</button>
        </form>
        <div className="admin-invitee-summary"><strong>{invitees.length}</strong><span>link khách mời đã tạo</span></div>
        <div className="admin-table-wrap admin-invitee-table"><table>
          <thead><tr><th>Tên hiển thị</th><th>Đường link riêng</th><th>Lượt mở</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{invitees.map((invitee) => <tr key={invitee.id}>
            <td><input className="admin-table-input" value={invitee.name} onChange={(event) => editInviteeName(invitee.id, event.target.value)} maxLength={150} /></td>
            <td><div className="admin-link-field"><input value={inviteeLink(invitee.token)} readOnly onFocus={(event) => event.target.select()} /><button type="button" onClick={() => copyInviteeLink(invitee)} aria-label={`Sao chép link của ${invitee.name}`}>{copiedInvitee === invitee.id ? <Check size={15} /> : <Copy size={15} />}</button></div></td>
            <td><strong>{invitee.viewCount || 0}</strong><small>{invitee.lastOpenedAt ? `Lần cuối: ${new Date(invitee.lastOpenedAt).toLocaleString('vi-VN')}` : 'Chưa mở link'}</small></td>
            <td><label className="admin-invitee-status"><input type="checkbox" checked={invitee.isActive} onChange={(event) => saveInvitee(invitee, { isActive: event.target.checked })} disabled={inviteeBusy === invitee.id} /><span />{invitee.isActive ? 'Đang hoạt động' : 'Đã tắt'}</label></td>
            <td><div className="admin-invitee-actions"><button type="button" onClick={() => saveInvitee(invitee)} disabled={inviteeBusy === invitee.id || !invitee.name.trim()}><Save size={15} /> Lưu tên</button><button type="button" className="danger" onClick={() => deleteInvitee(invitee)} disabled={inviteeBusy === invitee.id}><Trash2 size={15} /> Xóa</button></div></td>
          </tr>)}</tbody>
        </table>{!invitees.length && <p className="admin-empty">Chưa có link khách mời. Hãy nhập tên để tạo link đầu tiên.</p>}</div>
      </Panel>

      <Panel id="submissions" eyebrow="Phản hồi" title="Khách mời và lời chúc" previewSection="guestbook" onPreview={showPreviewSection}>
        <div className="admin-submission-grid">
          <div><h3>RSVP <span>{submissions.rsvps.length}</span></h3><div className="admin-table-wrap"><table><thead><tr><th>Khách mời</th><th>Trạng thái</th><th>Số khách</th><th>Liên hệ</th></tr></thead><tbody>{submissions.rsvps.map((item) => <tr key={item.id}><td><strong>{item.guestName}</strong><small>{item.note || 'Không có ghi chú'}</small></td><td><span className={`status ${item.attendance}`}>{item.attendance === 'attending' ? 'Tham dự' : item.attendance === 'maybe' ? 'Chưa chắc' : 'Vắng mặt'}</span></td><td>{item.guestCount}</td><td>{item.phone || '—'}</td></tr>)}</tbody></table>{!submissions.rsvps.length && <p className="admin-empty">Chưa có phản hồi RSVP.</p>}</div></div>
          <div><h3>Lời chúc <span>{submissions.wishes.length}</span></h3><div className="admin-wishes">{submissions.wishes.map((wish) => <article key={wish.id} className={!wish.isVisible ? 'hidden' : ''}><div><strong>{wish.guestName}</strong><time>{new Date(wish.createdAt).toLocaleDateString('vi-VN')}</time></div><p>{wish.message}</p><div className="admin-wish-actions"><button type="button" onClick={() => toggleWish(wish)}>{wish.isVisible ? <><EyeOff size={15} /> Ẩn khỏi thiệp</> : <><Eye size={15} /> Hiện trên thiệp</>}</button><button type="button" className="danger" onClick={() => deleteWish(wish)}><Trash2 size={15} /> Xóa</button></div></article>)}{!submissions.wishes.length && <p className="admin-empty">Chưa có lời chúc.</p>}</div></div>
        </div>
      </Panel>

      <div className="admin-savebar"><span>Hãy lưu để áp dụng thay đổi lên thiệp.</span><button className="admin-primary" onClick={save} disabled={saving}><Save size={17} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
    </main>
    {previewOpen && <aside className={`admin-live-preview${previewFullscreen ? ' fullscreen' : ''}`} aria-label="Bản xem trước trực tiếp của thiệp cưới">
      <div className="admin-preview-heading">
        <div><span>Xem trước trực tiếp</span><strong>Thiệp sau khi thay đổi</strong></div>
        <div>
          <button type="button" onClick={() => setPreviewFullscreen((current) => !current)} aria-label={previewFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}>{previewFullscreen ? <Shrink size={17} /> : <Expand size={17} />}</button>
          <button type="button" onClick={() => { setPreviewOpen(false); setPreviewFullscreen(false); }} aria-label="Đóng xem trước"><X size={18} /></button>
        </div>
      </div>
      <p>Mọi thay đổi xuất hiện ngay tại đây. Nhấn “Xem vị trí” ở từng mục để đến đúng phần đang sửa.</p>
      <div className="admin-preview-frame"><iframe ref={previewRef} src="/?preview=admin" title="Xem trước thiệp cưới" onLoad={() => { sendPreview(data); scrollPreview(previewTarget); }} /></div>
    </aside>}
  </div>;
}
