// Loader de next/image: las fotos de Cloudinary se piden directo a Cloudinary (que ya redimensiona
// y comprime) en vez de pasar por /_next/image. La optimización de Vercel tiene un cupo mensual en
// el plan Hobby y al agotarlo responde 402, dejando el panel sin imágenes.
// La transformación de tamaño se agrega al final de la cadena (justo antes de /v123/) para que se
// aplique después de cualquier transformación que ya traiga la URL. c_limit no agranda más allá del original.
type LoaderArgs = { src: string; width: number; quality?: number };

const VERSION = /\/v\d+\//;

export default function cloudinaryLoader({ src, width }: LoaderArgs) {
  if (src.includes('res.cloudinary.com') && src.includes('/image/upload/') && VERSION.test(src)) {
    return src.replace(VERSION, (v) => `/c_limit,w_${width}/f_auto,q_auto${v}`);
  }
  // Archivos locales de /public u otros hosts: se sirven tal cual.
  return src.startsWith('/') ? `${src}?w=${width}` : src;
}
