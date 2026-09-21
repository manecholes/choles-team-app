"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, ImageOff, UploadCloud } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";

interface GalleryImage {
  id: number;
  title: string;
  description: string | null;
  sortOrder: number;
  imagePath: string | null;
  createdAt: string;
}

interface GalleryForm {
  title: string;
  description: string;
  sortOrder: number;
}

const emptyForm: GalleryForm = { title: "", description: "", sortOrder: 0 };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SitioWebGaleriaPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [form, setForm] = useState<GalleryForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/gallery");
    const data = await res.json();
    setImages(data.images ?? []);
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

  function openEdit(img: GalleryImage) {
    setEditing(img);
    setForm({ title: img.title, description: img.description ?? "", sortOrder: img.sortOrder });
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
      const res = await fetch(editing ? `/api/gallery/${editing.id}` : "/api/gallery", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la foto");
        return;
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(img: GalleryImage) {
    if (!confirm(`¿Eliminar la foto "${img.title}"?`)) return;
    const res = await fetch(`/api/gallery/${img.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  const columns: Column<GalleryImage>[] = [
    {
      key: "thumb",
      header: "",
      render: (img) =>
        img.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/gallery/${img.id}/image`} alt={img.title} className="h-12 w-16 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-16 items-center justify-center rounded bg-turqui-50 text-turqui-300">
            <ImageOff className="h-5 w-5" />
          </div>
        ),
    },
    { key: "title", header: "Titulo", render: (img) => <span className="font-medium">{img.title}</span>, searchValue: (img) => img.title },
    { key: "description", header: "Descripcion", render: (img) => <span className="text-slate-500">{img.description ?? "-"}</span> },
    { key: "order", header: "Orden", render: (img) => img.sortOrder },
    {
      key: "actions",
      header: "",
      render: (img) => (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => openEdit(img)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button className="btn-ghost text-choles-red" onClick={() => handleDelete(img)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Galeria del sitio</h1>
        <p className="text-sm text-slate-500">
          Fotos que se muestran en <code>cholesteam.com/galeria</code>, publicas sin necesidad de iniciar sesion.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={images}
          searchPlaceholder="Buscar foto..."
          emptyMessage="Todavia no hay fotos en la galeria."
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nueva foto
            </button>
          }
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar foto" : "Nueva foto"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Titulo</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Entrenamiento U12"
            />
          </div>
          <div>
            <label className="label">Descripcion (opcional)</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Orden (menor aparece primero)</label>
            <input
              type="number"
              className="input"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Foto {editing ? "(deja vacio para mantener la actual)" : ""}</label>
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
