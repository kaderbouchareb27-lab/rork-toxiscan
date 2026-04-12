import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

export function compressImageWeb(uri: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      try {
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
        const base64Part = dataUrl.split(',')[1];
        if (!base64Part || base64Part.length < 100) {
          reject(new Error('Web compression produced invalid base64'));
          return;
        }
        resolve(base64Part);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = uri;
  });
}

async function readFileAsBase64(fileUri: string): Promise<string> {
  try {
    console.log('[ImageCompression] Reading file as base64 via expo-file-system:', fileUri);
    const file = new File(fileUri);
    const base64 = await file.base64();
    console.log('[ImageCompression] File read success, base64 length:', base64.length);
    return base64;
  } catch (error) {
    console.error('[ImageCompression] expo-file-system read failed:', error);
    throw new Error('Unable to read image file');
  }
}

export async function compressImageNative(uri: string, resizeWidth: number = 800, quality: number = 0.7): Promise<string> {
  try {
    console.log('[ImageCompression] Compressing native image, width:', resizeWidth);
    const manipulated = await manipulateAsync(
      uri,
      [{ resize: { width: resizeWidth } }],
      { compress: quality, format: SaveFormat.JPEG, base64: true }
    );

    if (manipulated.base64 && manipulated.base64.length > 100) {
      console.log('[ImageCompression] Compressed successfully, base64 length:', manipulated.base64.length);
      return manipulated.base64;
    }

    console.log('[ImageCompression] No base64 returned from manipulateAsync, reading file directly');
    return await readFileAsBase64(manipulated.uri);
  } catch (error) {
    console.error('[ImageCompression] Native compression error:', error);
    console.log('[ImageCompression] Falling back to raw file read...');
    try {
      return await readFileAsBase64(uri);
    } catch (fallbackError) {
      console.error('[ImageCompression] All compression methods failed:', fallbackError);
      throw new Error('Impossible de traiter la photo. Veuillez réessayer.');
    }
  }
}
