'use client';
import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { imageUrl, uploadImages } from '@/lib/api';

export function ImageUploader({ value, onChange, multiple }: { value: string[]; onChange: (v: string[]) => void; multiple?: boolean }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadImages(files);
      onChange(multiple ? [...value, ...urls] : urls.slice(0, 1));
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <div key={src + i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(src)} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-0 right-0 hidden h-6 w-6 bg-red-600 text-white group-hover:block">×</button>
          </div>
        ))}
        {(multiple || !value.length) && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-500">
            {uploading ? '...' : '+ Ảnh'}
            <input type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
          </label>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input" placeholder="hoặc dán URL ảnh" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="btn-outline" onClick={() => { if (url) { onChange(multiple ? [...value, url] : [url]); setUrl(''); } }}>Thêm</button>
      </div>
    </div>
  );
}
