"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge } from "@/components/Badge";

interface DocumentRow {
  id: number;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  player: { id: number; firstName: string; lastName: string };
}

const TYPE_LABEL: Record<string, string> = {
  ID: "Documento de identidad",
  EPS: "EPS",
  AUTHORIZATION: "Autorizacion",
  CERTIFICATE: "Certificado",
  PHOTO: "Foto",
  OTHER: "Otro",
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/documents${params.toString() ? `?${params}` : ""}`);
    const data = await res.json();
    setDocuments(data.documents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  async function handleDelete(d: DocumentRow) {
    if (!confirm(`¿Eliminar el documento "${d.fileName}"?`)) return;
    await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
    await loadData();
  }

  const columns: Column<DocumentRow>[] = useMemo(
    () => [
      {
        key: "player",
        header: "Jugador",
        render: (d) => `${d.player.firstName} ${d.player.lastName}`,
        searchValue: (d) => `${d.player.firstName} ${d.player.lastName} ${d.fileName}`,
      },
      { key: "type", header: "Tipo", render: (d) => <Badge tone="gray">{TYPE_LABEL[d.type] ?? d.type}</Badge> },
      { key: "file", header: "Archivo", render: (d) => d.fileName },
      { key: "size", header: "Tamano", render: (d) => fmtSize(d.sizeBytes) },
      { key: "date", header: "Subido", render: (d) => new Date(d.uploadedAt).toLocaleDateString("es-CO") },
      {
        key: "actions",
        header: "",
        render: (d) => (
          <div className="flex gap-2">
            <a href={`/api/documents/${d.id}/file`} target="_blank" className="btn-ghost" title="Ver / descargar">
              <Download className="h-4 w-4" />
            </a>
            <button className="btn-ghost text-choles-red" onClick={() => handleDelete(d)} title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Documentos</h1>
        <p className="text-sm text-slate-500">Documentos de identidad, EPS, autorizaciones y certificados de todos los jugadores.</p>
      </div>

      <div className="card">
        <label className="label">Tipo de documento</label>
        <select className="input max-w-xs" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={documents}
          searchPlaceholder="Buscar por jugador o archivo..."
          emptyMessage="No hay documentos subidos todavia. Sube documentos desde el perfil de cada jugador."
        />
      )}

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <FileText className="h-3.5 w-3.5" /> Para subir un nuevo documento, ve al perfil del jugador correspondiente, pestana
        &quot;Documentos&quot;.
      </p>
    </div>
  );
}
