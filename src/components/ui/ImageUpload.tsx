'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string, publicId?: string) => void;
  label?: string;
  aspectRatio?: 'square' | 'video' | 'landscape';
  maxSize?: number;
}

export function ImageUpload({ 
  value, 
  onChange, 
  label = 'Upload Image',
  aspectRatio = 'square',
  maxSize = 5 
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    
    const maxSizeMB = maxSize * 1024 * 1024;
    if (file.size > maxSizeMB) {
      setError(`File too large. Max size: ${maxSize}MB`);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', label.toLowerCase().includes('aadhar') ? 'aadhar' : 'photo');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.url, data.publicId);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (value && value.includes('cloudinary')) {
      try {
        const publicId = value.split('/').slice(-2).join('/').split('.')[0];
        await fetch(`/api/upload?publicId=${encodeURIComponent(publicId)}`, {
          method: 'DELETE',
        });
      } catch {}
    }
    onChange('', '');
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      
      {value ? (
        <div className={`${styles.preview} ${styles[aspectRatio]}`}>
          <img src={value} alt={label} />
          <button
            type="button"
            onClick={handleRemove}
            className={styles.removeBtn}
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className={`${styles.uploadBtn} ${styles[aspectRatio]}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          {loading ? (
            <>
              <Loader2 size={24} className={styles.spinner} />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={24} />
              <span>Click to upload</span>
              <span className={styles.hint}>Max {maxSize}MB</span>
            </>
          )}
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}