export const fallbackInvitation = {
  slug: 'hoang-long-bao-ngoc',
  groomName: 'Tiến Anh', brideName: 'Hải Yến', tagline: 'SAVE THE DATE',
  invitationHeading: 'Thông tin lễ cưới',
  announcementText: 'TRÂN TRỌNG BÁO TIN\nLỄ THÀNH HÔN CỦA CON CHÚNG TÔI',
  groomRole: 'TRƯỞNG NAM', brideRole: 'ÚT NỮ',
  ceremonyIntro: 'LỄ THÀNH HÔN ĐƯỢC CỬ HÀNH TẠI', ceremonyVenue: 'TƯ GIA',
  weddingDate: '2026-01-03', ceremonyTime: '09:00:00', receptionGuestTime: '17:30:00', receptionTime: '18:00:00',
  lunarDate: '(Tức ngày 15 tháng 11 năm Ất Tỵ)', heroImage: '/images/wedding-hero.png',
  venue: {
    name: 'Trung Tâm Hội Nghị White Palace',
    address: '194 Hoàng Văn Thụ, Phường 9, Quận Phú Nhuận, TP. Hồ Chí Minh',
    mapEmbedUrl: 'https://www.google.com/maps?q=White+Palace+Hoang+Van+Thu&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=White+Palace+Hoang+Van+Thu',
    groomHome: {
      name: 'Tư gia nhà trai', address: 'Quận 1, TP. Hồ Chí Minh',
      mapUrl: 'https://www.google.com/maps?q=Quan+1+Ho+Chi+Minh',
      mapEmbedUrl: 'https://www.google.com/maps?q=Quan+1+Ho+Chi+Minh&output=embed',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Quan+1+Ho+Chi+Minh'
    },
    brideHome: {
      name: 'Tư gia nhà gái', address: 'Quận 3, TP. Hồ Chí Minh',
      mapUrl: 'https://www.google.com/maps?q=Quan+3+Ho+Chi+Minh',
      mapEmbedUrl: 'https://www.google.com/maps?q=Quan+3+Ho+Chi+Minh&output=embed',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Quan+3+Ho+Chi+Minh'
    }
  },
  dressColors: ['#5b1118', '#963b43', '#d6aa46', '#eee5d8'],
  gift: {
    groom: { label: 'Chú rể', bankName: 'Vietcombank', accountName: 'DANG HOANG LONG', accountNumber: '0123456789', message: 'HLBN 03012026', qrImage: '' },
    bride: { label: 'Cô dâu', bankName: '', accountName: '', accountNumber: '', message: '', qrImage: '' }
  },
  families: [
    { side: 'groom', parent_label: 'Ông Bà', father_name: 'Đặng Văn Thắng', mother_name: 'Bùi Thị Mai', address: 'Quận 1, TP. Hồ Chí Minh' },
    { side: 'bride', parent_label: 'Ông Bà', father_name: 'Vũ Đức Trung', mother_name: 'Ngô Thị Hạnh', address: 'Quận 3, TP. Hồ Chí Minh' }
  ],
  gallery: [
    { id: 1, image_url: '/images/wedding-hero.png', alt_text: 'Cô dâu chú rể bên nhau' },
    { id: 2, image_url: '/images/wedding-gallery.png', alt_text: 'Khoảnh khắc hạnh phúc của cô dâu chú rể' },
    { id: 3, image_url: '/images/wedding-hero.png', alt_text: 'Ảnh cưới Tiến Anh và Hải Yến' },
    { id: 4, image_url: '/images/wedding-gallery.png', alt_text: 'Cô dâu chú rể nắm tay' }
  ],
  schedule: [
    { time_label: '17:00', title: 'Đón khách', icon: 'camera' }, { time_label: '18:00', title: 'Khai tiệc', icon: 'glass' },
    { time_label: '18:30', title: 'Nghi thức cưới', icon: 'rings' }, { time_label: '19:00', title: 'Cắt bánh & nâng ly', icon: 'cake' },
    { time_label: '20:30', title: 'Kết thúc tiệc', icon: 'heart' }
  ]
};

export const fallbackWishes = [
  { id: 1, guestName: 'Duy Khang', message: 'Chúc mừng ngày vui của hai bạn, trăm năm hạnh phúc bên nhau!', createdAt: '2026-07-26T12:30:49' },
  { id: 2, guestName: 'Lan Chi', message: 'Đẹp đôi quá! Chúc hai bạn sống bên nhau đầu bạc răng long.', createdAt: '2026-07-26T12:30:49' },
  { id: 3, guestName: 'Tuấn Anh', message: 'Mừng hạnh phúc hai bạn! Chúc gia đình nhỏ luôn đầy ắp tiếng cười.', createdAt: '2026-07-26T12:30:49' }
];
