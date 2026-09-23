import { PackageSearch } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listPublicProducts } from "@/server/services/product.service";
import { buildMailtoLink, buildWhatsAppLink } from "@/lib/site-contact";

// Se accede a la base de datos en cada visita; evita que Next intente
// pre-renderizarla estaticamente durante el build (donde la DB no es
// alcanzable), lo que rompia el despliegue en Railway.
export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  UNIFORME: "Uniformes",
  BALON: "Balones",
  ZAPATO: "Zapatos",
  CAMISETA: "Camisetas",
  GORRA: "Gorras",
  OTRO: "Otros",
};

const CATEGORY_ORDER = ["UNIFORME", "CAMISETA", "GORRA", "ZAPATO", "BALON", "OTRO"];

function formatPrice(price: unknown) {
  if (price === null || price === undefined) return null;
  return Number(price).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

/** Pagina publica: catalogo de la tienda (sin sesion). Solo para mostrar productos -- no hay pagos en linea. */
export default async function TiendaPage() {
  const products = await listPublicProducts();
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    key: cat,
    label: CATEGORY_LABEL[cat],
    items: products.filter((p) => p.category === cat),
  })).filter((group) => group.items.length > 0);

  const askMessage = "Hola, quiero preguntar por un producto de la tienda de Choles Team.";

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />

      <section className="bg-turqui-700 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-turqui-100">Choles Team</p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Tienda</h1>
          <p className="mt-3 text-turqui-100">Uniformes, balones, zapatos, camisetas y gorras del club.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="card flex flex-col items-center gap-3 border-choles-red/20 bg-red-50 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-slate-700">
            Este catalogo es informativo -- <strong>no se compra en linea</strong>. Para preguntar por
            disponibilidad, tallas o hacer un pedido, escribenos por WhatsApp o correo.
          </p>
          <div className="flex shrink-0 gap-2">
            <a href={buildWhatsAppLink(askMessage)} target="_blank" rel="noopener noreferrer" className="btn-primary">
              WhatsApp
            </a>
            <a href={buildMailtoLink("Consulta sobre la tienda")} className="btn-secondary">
              Correo
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-12 px-6 pb-16">
        {byCategory.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Todavia no hay productos publicados.</p>
        ) : (
          byCategory.map((group) => (
            <div key={group.key}>
              <h2 className="text-xl font-bold text-turqui-700">{group.label}</h2>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((p) => (
                  <div key={p.id} className="card overflow-hidden p-0">
                    {p.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/products/${p.id}/image`}
                        alt={p.name}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-turqui-50 text-turqui-400">
                        <PackageSearch className="h-10 w-10" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-turqui-700">{p.name}</h3>
                        {!p.available && <span className="badge-gray shrink-0">Agotado</span>}
                      </div>
                      {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
                      {formatPrice(p.price) && (
                        <p className="mt-2 font-semibold text-choles-red">{formatPrice(p.price)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <PublicFooter />
    </main>
  );
}
