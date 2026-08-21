const MAX_SOURCE_BYTES = 5 * 1024 * 1024
const MAX_EDGE_PX = 1280
const WEBP_QUALITY = 0.72
const MAX_RESULT_BYTES = 400 * 1024

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

export type CompressImageResult = {
  blob: Blob
  fileName: string
}

export class CompressImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CompressImageError"
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new CompressImageError("Foto tidak bisa dibaca. Pilih JPG atau PNG."))
    }
    img.src = url
  })
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new CompressImageError("Gagal kompres foto. Coba lagi."))
          return
        }
        resolve(blob)
      },
      "image/webp",
      WEBP_QUALITY,
    )
  })
}

/** Kompres ke WebP: max 1280px sisi panjang, quality 0.72, hasil max 400 KB. */
export async function compressImageToWebp(file: File): Promise<CompressImageResult> {
  if (!file || file.size <= 0) {
    throw new CompressImageError("Pilih foto dulu")
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new CompressImageError("Foto terlalu besar. Maksimal 5 MB.")
  }

  const type = (file.type || "").toLowerCase()
  if (type && !ALLOWED_TYPES.has(type)) {
    throw new CompressImageError("Format foto tidak didukung. Pakai JPG atau PNG.")
  }

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch (err) {
    if (err instanceof CompressImageError) throw err
    if (type === "image/heic" || type === "image/heif") {
      throw new CompressImageError("HEIC tidak didukung di browser ini. Pakai JPG atau PNG.")
    }
    throw new CompressImageError("Foto tidak bisa dibaca. Pilih JPG atau PNG.")
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new CompressImageError("Gagal kompres foto. Coba lagi.")
  }
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await canvasToWebp(canvas)
  if (blob.size > MAX_RESULT_BYTES) {
    throw new CompressImageError("Foto terlalu besar, pilih ulang")
  }

  const stamp = Date.now()
  return { blob, fileName: `${stamp}.webp` }
}
