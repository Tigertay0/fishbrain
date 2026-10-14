import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nowIso, type Photo } from './db'

const FULL_PX = 1600
const THUMB_PX = 400

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older Safari: fall back to an <img>, which applies EXIF orientation itself.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function toJpeg(src: ImageBitmap | HTMLImageElement, maxPx: number, quality: number): Promise<Blob> {
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height
  const scale = Math.min(1, maxPx / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'))
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', quality),
  )
}

/** Shrinks a camera photo (often 5+ MB) to a 1600px JPEG and a 400px thumbnail. */
export async function makePhoto(file: Blob): Promise<Photo> {
  const img = await decode(file)
  const [full, thumb] = await Promise.all([toJpeg(img, FULL_PX, 0.82), toJpeg(img, THUMB_PX, 0.75)])
  if ('close' in img) img.close()
  return { id: newId(), full, thumb, createdAt: nowIso() }
}

/** An object URL for a stored photo, revoked when the component unmounts. */
export function usePhotoUrl(id: string | undefined, size: 'full' | 'thumb'): string | undefined {
  const photo = useLiveQuery(() => (id ? db.photos.get(id) : undefined), [id])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photo) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(photo[size])
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo, size])
  return url
}
