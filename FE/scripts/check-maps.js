import assert from 'node:assert/strict';
import { googleMapsEmbedUrl } from '../src/mapUtils.js';

const groomEmbed = googleMapsEmbedUrl({
  name: 'Tư gia nhà trai',
  address: 'Quốc Oai, Hà Nội',
  mapUrl: 'https://www.google.com/maps/search/21.083734,+105.587205?entry=tts'
});
assert.equal(groomEmbed, 'https://www.google.com/maps?q=21.083734%2C105.587205&output=embed');

const brideEmbed = googleMapsEmbedUrl({
  name: 'Tư gia nhà gái',
  address: 'Quận 3, TP. Hồ Chí Minh',
  mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=Quan+3+Ho+Chi+Minh'
});
assert.equal(brideEmbed, 'https://www.google.com/maps?q=Quan%203%20Ho%20Chi%20Minh&output=embed');

const fallbackEmbed = googleMapsEmbedUrl({ name: 'Tư gia', address: 'Hà Nội', mapUrl: '' });
assert.equal(fallbackEmbed, 'https://www.google.com/maps?q=T%C6%B0%20gia%2C%20H%C3%A0%20N%E1%BB%99i&output=embed');

console.log('Google Maps check passed (expanded URL, directions URL, fallback).');
