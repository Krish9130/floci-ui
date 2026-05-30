import { useState } from "react";
import { KeyRound, Plus, Trash2, Eye, EyeOff, RefreshCw, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  useSecretsQuery,
  useSecretValueQuery,
  useCreateSecretMutation,
  useDeleteSecretMutation,
} from "@/api/aws/secretsmanager.queries";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SecretValueViewer({ secretId }: { secretId: string }) {
  const [show, setShow] = useState(false);
  const { data, isLoading, isError } = useSecretValueQuery(secretId, show);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        className="icon-btn"
        onClick={() => setShow((s) => !s)}
        title={show ? "Hide value" : "Show value"}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {show ? (
        isLoading ? (
          <Loader2 size={14} className="spin" />
        ) : isError ? (
          <span style={{ color: "var(--danger)" }}>Error loading value</span>
        ) : (
          <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>
            {data}
          </code>
        )
      ) : (
        <span style={{ color: "var(--text-muted)" }}>••••••••</span>
      )}
    </div>
  );
}

function CreateSecretModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const createMut = useCreateSecretMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(
      { name, value, description },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Secret</h3>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form id="create-secret-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label>Secret Name</label>
              <input
                autoFocus
                required
                className="input"
                placeholder="my-db-secret"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Secret Value</label>
              <textarea
                required
                className="input"
                placeholder="secret-string-or-json"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{ minHeight: 80, fontFamily: "monospace" }}
              />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input
                className="input"
                placeholder="Database credentials"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="button" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="button primary"
            type="submit"
            form="create-secret-form"
            disabled={createMut.isPending || !name || !value}
          >
            {createMut.isPending ? <Loader2 size={14} className="spin" /> : "Create Secret"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SecretsManagerPage() {
  const secretsQuery = useSecretsQuery();
  const deleteMut = useDeleteSecretMutation();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = (secretId: string) => {
    if (confirm(`Are you sure you want to delete secret ${secretId}?`)) {
      deleteMut.mutate(secretId);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h2>Secrets Manager</h2>
          <span className="info-link">AWS Secrets Manager</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="button"
            onClick={() => void secretsQuery.refetch()}
            disabled={secretsQuery.isFetching}
          >
            <RefreshCw size={13} className={secretsQuery.isFetching ? "spin" : ""} />
            Refresh
          </button>
          <button
            className="button primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={13} />
            Create Secret
          </button>
        </div>
      </div>

      <div className="table-panel">
        {secretsQuery.isLoading ? (
          <div style={{ padding: 24 }}>Loading secrets...</div>
        ) : secretsQuery.isError ? (
          <EmptyState
            icon={KeyRound}
            title="Error"
            description="Failed to load secrets."
          />
        ) : secretsQuery.data?.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No Secrets"
            description="You don't have any secrets in this region."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Value</th>
                <th>Last Changed</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {secretsQuery.data?.map((s) => (
                <tr key={s.arn}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.description || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>
                    <SecretValueViewer secretId={s.name} />
                  </td>
                  <td>{formatDate(s.lastChangedDate)}</td>
                  <td>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(s.name)}
                      title="Delete secret"
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateSecretModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
