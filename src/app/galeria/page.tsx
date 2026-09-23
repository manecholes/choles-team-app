import { ImageOff } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listPublicGalleryImages } from "@/server/services/gallery.service";

// Se accede a la base de datos en cada visita; evita que Next intente
// pre-renderizarla estaticamente durante el build (donde la DB no es
// alcanzable), lo que rompia el despliegue en Railway.
export const dynamic = "force-dynamic";

/** Pagina publica: Galeria de fotos del club (sin sesion). */
export default async function GaleriaPage() {
  const images = await listPublicGalleryImages();

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />

      <section className="bg-turqui-700 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-turqui-100">Choles Team</p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Galeria</h1>
          <p className="mt-3 text-turqui-100">Entrenamientos, partidos, torneos y momentos del club.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        {images.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Todavia no hay fotos publicadas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <figure key={img.id} className="card overflow-hidden p-0">
                {img.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/gallery/${img.id}/image`}
                    alt={img.title}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 w-full flex-col items-center justify-center gap-2 bg-turqui-50 text-turqui-400">
                    <ImageOff className="h-10 w-10" />
                    <span className="text-xs">Foto pendiente de subir</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-turqui-700">{img.title}</h3>
                  {img.description && <p className="mt-1 text-sm text-slate-600">{img.description}</p>}
                </div>
              </figure>
            ))}
          </div>
        )}
      </section>

      <PublicFooter />
    </main>
  );
}
