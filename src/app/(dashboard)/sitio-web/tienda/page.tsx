"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, PackageSearch, UploadCloud } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";

const CATEGORY_LABEL: Record<string, string> = {
  UNIFORME: "Uniforme",
  BALON: "Balon",
  ZAPATO: "Zapato",
  CAMISETA: "Camiseta",
  GORRA: "Gorra",
  OTRO: "Otro",
};

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  category: string;
  available: boolean;
  sortOrder: number;
  imagePath: string | null;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  available: boolean;
  sortOrder: number;
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "UNIFORME",
  available: true,
  sortOrder: 0,
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtPrice(price: string | null) {
  if (price === null) return "-";
  return Number(price).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default function SitioWebTiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: p.price ?? "",
      category: p.category,
      available: p.available,
      sortOrder: p.sortOrder,
    });
    setFile(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (file) {
        payload.image = {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data: await fileToBase64(file),
        };
      }
      const res = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el producto");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`¿Eliminar el producto "${p.name}"?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<Product>[] = [
    {
      key: "thumb",
      header: "",
      render: (p) =>
        p.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/products/${p.id}/image`} alt={p.name} className="h-12 w-16 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-16 items-center justify-center rounded bg-turqui-50 text-turqui-300">
            <PackageSearch className="h-5 w-5" />
          </div>
        ),
    },
    { key: "name", header: "Producto", render: (p) => <span className="font-medium">{p.name}</span>, searchValue: (p) => p.name },
    { key: "category", header: "Categoria", render: (p) => CATEGORY_LABEL[p.category] ?? p.category },
    { key: "price", header: "Precio", render: (p) => fmtPrice(p.price) },
    {
      key: "available",
      header: "Estado",
      render: (p) => <Badge tone={p.available ? "green" : "gray"}>{p.available ? "Disponible" : "Agotado"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => openEdit(p)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(p)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Tienda (catalogo)</h1>
        <p className="text-sm text-slate-500">
          Productos que se muestran en <code>cholesteam.com/tienda</code>. Es solo un catalogo -- no hay pagos en
          linea, los pedidos se hacen por WhatsApp o correo.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={products}
          searchPlaceholder="Buscar producto..."
          emptyMessage="Todavia no hay productos publicados."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar producto" : "Nuevo producto"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripcion (opcional)</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Precio (opcional)</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="90000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
            />
            Disponible
          </label>
          <div>
            <label className="label">Foto {editing ? "(deja vacio para mantener la actual)" : "(opcional)"}</label>
            <label className="btn-secondary w-full cursor-pointer justify-center">
              <UploadCloud className="h-4 w-4" />
              {file ? file.name : "Elegir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
