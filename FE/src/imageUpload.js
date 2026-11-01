const MEBIBYTE = 1024 * 1024;

export const IMAGE_UPLOAD_TARGET_BYTES = Math.floor(9.5 * MEBIBYTE);

const MAX_SOURCE_BYTES = 60 * MEBIBYTE;
const MAX_IMAGE_EDGE = 3200;
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.64, 0.54, 0.44];

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Không thể tối ưu ảnh này. Vui lòng thử ảnh JPG, PNG hoặc WEBP khác.'));
  }, type, quality);
});

const loadImage = async (file) => {
  if ('createImageBitmap' in window) {
    try {
      return await window.createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      return window.createImageBitmap(file);
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const outputName = (name, type) => {
  const extension = type === 'image/webp' ? 'webp' : type === 'image/jpeg' ? 'jpg' : 'png';
  return `${name.replace(/\.[^.]+$/, '') || 'anh-thiep'}.${extension}`;
};

export async function prepareImageForUpload(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Vui lòng chọn một tệp ảnh hợp lệ.');
  }
  if (file.size <= IMAGE_UPLOAD_TARGET_BYTES) {
    return { file, optimized: false };
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Ảnh gốc lớn hơn 60 MB. Vui lòng giảm kích thước ảnh rồi thử lại.');
  }
  if (file.type === 'image/gif') {
    throw new Error('GIF lớn không thể tự nén mà vẫn giữ chuyển động. Vui lòng đổi sang JPG, PNG hoặc WEBP.');
  }

  const source = await loadImage(file);
  const sourceWidth = source.width || source.naturalWidth;
  const sourceHeight = source.height || source.naturalHeight;
  const initialScale = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * initialScale));
  let height = Math.max(1, Math.round(sourceHeight * initialScale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: true });

  if (!context) {
    source.close?.();
    throw new Error('Trình duyệt không hỗ trợ tối ưu ảnh. Vui lòng thử trình duyệt khác.');
  }

  try {
    for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(source, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, 'image/webp', quality);
        if (blob.size <= IMAGE_UPLOAD_TARGET_BYTES) {
          const outputType = blob.type || 'image/png';
          return {
            file: new File([blob], outputName(file.name, outputType), { type: outputType, lastModified: Date.now() }),
            optimized: true
          };
        }
      }

      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  } finally {
    source.close?.();
  }

  throw new Error('Không thể nén ảnh xuống dưới 10 MB. Vui lòng chọn ảnh có độ phân giải thấp hơn.');
}
