export async function compressImageToDataUrl(
  file: File,
  maxDimension = 960,
  quality = 0.78
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Berkas harus berupa gambar (JPG, PNG, atau WEBP).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
    el.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawDataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  let output = canvas.toDataURL('image/jpeg', quality);
  if (output.length > 260000) {
    output = canvas.toDataURL('image/jpeg', 0.58);
  }
  if (output.length > 295000) {
    throw new Error('Ukuran gambar terlalu besar setelah kompresi. Gunakan foto beresolusi lebih kecil.');
  }
  return output;
}
