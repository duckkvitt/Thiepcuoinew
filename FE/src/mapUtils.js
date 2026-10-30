export function googleMapsEmbedUrl(location) {
  const fallbackQuery = [location.name, location.address].filter(Boolean).join(', ');
  const sourceUrl = location.mapUrl || location.directionsUrl || location.mapEmbedUrl || '';
  let query = fallbackQuery;

  try {
    const mapUrl = new URL(sourceUrl);
    const decodedUrl = decodeURIComponent(`${mapUrl.pathname}${mapUrl.search}`);
    const coordinateMatch = decodedUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      || decodedUrl.match(/!3d(-?\d+(?:\.\d+))!4d(-?\d+(?:\.\d+))/)
      || decodedUrl.match(/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)/);
    const placeMatch = decodedUrl.match(/\/maps\/(?:place|search)\/([^/?]+)/);
    query = mapUrl.searchParams.get('q')
      || mapUrl.searchParams.get('query')
      || mapUrl.searchParams.get('destination')
      || mapUrl.searchParams.get('ll')
      || (coordinateMatch ? `${coordinateMatch[1]},${coordinateMatch[2]}` : '')
      || (placeMatch ? placeMatch[1].replaceAll('+', ' ') : '')
      || fallbackQuery;
  } catch {
    // Link chưa hoàn chỉnh vẫn dùng tên và địa chỉ đã nhập.
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
