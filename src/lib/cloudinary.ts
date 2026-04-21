import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadImage(
  file: Buffer,
  options?: {
    folder?: string;
  }
): Promise<UploadResult> {
  const uploadOptions: any = {
    folder: options?.folder || 'pg-manager',
    resource_type: 'image' as const,
    use_filename: true,
    unique_filename: true,
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      uploadStream.end(file);
    });

    return {
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
      width: (result as any).width,
      height: (result as any).height,
      format: (result as any).format,
    };
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

export async function uploadFromUrl(url: string, options?: {
  folder?: string;
}): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(url, {
    folder: options?.folder || 'pg-manager',
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch {
    return false;
  }
}

export function getOptimizedUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
}): string {
  return cloudinary.url(publicId, {
    width: options?.width,
    height: options?.height,
    crop: options?.crop || 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
}