import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { env } from './env.js';

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Detects the real image type from the file's first bytes, ignoring the client-supplied mime type. */
export function sniffImageType(buf: Buffer): keyof typeof EXTENSIONS | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  const head = buf.subarray(0, 6).toString('ascii');
  if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif';
  return null;
}

export async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Could not list storage buckets: ${error.message}`);
  if (buckets.some((b) => b.name === env.supabaseBucket)) return 'exists';
  const { error: createError } = await supabase.storage.createBucket(env.supabaseBucket, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: Object.keys(EXTENSIONS),
  });
  if (createError) throw new Error(`Could not create bucket "${env.supabaseBucket}": ${createError.message}`);
  return 'created';
}

export async function uploadImage(buf: Buffer, mimeType: string) {
  const ext = EXTENSIONS[mimeType];
  const month = new Date().toISOString().slice(0, 7);
  const storagePath = `uploads/${month}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(env.supabaseBucket).upload(storagePath, buf, {
    contentType: mimeType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(env.supabaseBucket).getPublicUrl(storagePath);
  return { storagePath, url: data.publicUrl };
}

// Student videos live in their own public bucket: bigger files and video types only.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};
const videoBucket = () => `${env.supabaseBucket}-videos`;

export async function ensureVideoBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Could not list storage buckets: ${error.message}`);
  if (buckets.some((b) => b.name === videoBucket())) return 'exists';
  const { error: createError } = await supabase.storage.createBucket(videoBucket(), {
    public: true,
    fileSizeLimit: MAX_VIDEO_BYTES,
    allowedMimeTypes: Object.keys(VIDEO_TYPES),
  });
  if (createError) throw new Error(`Could not create bucket "${videoBucket()}": ${createError.message}`);
  return 'created';
}

/** A one-time upload link, so the browser sends the video straight to storage instead of through this server. */
export async function signVideoUpload(mimeType: string) {
  const ext = VIDEO_TYPES[mimeType];
  const month = new Date().toISOString().slice(0, 7);
  const storagePath = `videos/${month}/${randomUUID()}.${ext}`;
  const bucket = supabase.storage.from(videoBucket());
  const { data, error } = await bucket.createSignedUploadUrl(storagePath);
  if (error) throw new Error(`Could not prepare the upload: ${error.message}`);
  return { uploadUrl: data.signedUrl, url: bucket.getPublicUrl(storagePath).data.publicUrl };
}

export async function removeImage(storagePath: string) {
  const { error } = await supabase.storage.from(env.supabaseBucket).remove([storagePath]);
  if (error) throw new Error(`Could not delete file: ${error.message}`);
}
