import * as ImageManipulator from 'expo-image-manipulator';

export function compressImageWeb(uri: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = uri;
  });
}

export async function compressImageNative(uri: string, resizeWidth: number = 800, quality: number = 0.7): Promise<string> {
  try {
    console.log('[ImageCompression] Compressing native image, width:', resizeWidth);
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: resizeWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (manipulated.base64) {
      console.log('[ImageCompression] Compressed successfully, base64 length:', manipulated.base64.length);
      return manipulated.base64;
    }

    console.log('[ImageCompression] No base64 returned, falling back to file-system');
    const FileSystemLegacy = await import('expo-file-system/legacy');
    const base64 = await FileSystemLegacy.readAsStringAsync(manipulated.uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    console.log('[ImageCompression] Fallback base64 length:', base64.length);
    return base64;
  } catch (error) {
    console.error('[ImageCompression] Native compression error:', error);
    console.log('[ImageCompression] Falling back to raw file read...');
    const FileSystemLegacy = await import('expo-file-system/legacy');
    const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return base64;
  }
}
