import { useEffect, useMemo, useState } from "react";
import { Database, HardDrive, Info, Network, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import type { RdsInstance } from "@/api/aws/rds.api";
import {
  useRdsInstanceQuery,
  useRdsInstancesQuery,
} from "@/api/aws/rds.queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rdsClient } from "@/api/aws/rds.api";
import { Loader2, Play, Square, RotateCcw, Trash2, X } from "lucide-react";

function statusClass(status?: string) {
  const normalized = status?.toLowerCase();
  if (normalized === "available") return "healthy";
  if (
    normalized === "creating" ||
    normalized === "modifying" ||
    normalized === "backing-up"
  ) {
    return "degraded";
  }
  if (normalized === "failed" || normalized === "deleting") return "unavailable";
  return "unknown";
}

function yesNo(value?: boolean) {
  if (value === undefined) return "-";
  return value ? "Enabled" : "Disabled";
}

function InstanceListItem({
  instance,
  active,
  onSelect,
}: {
  instance: RdsInstance;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`list-item ${active ? "active" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <strong>{instance.identifier}</strong>
      <span>
        {instance.engine ?? "database"} {instance.engineVersion ?? "-"} ·{" "}
        {instance.instanceClass ?? "-"}
      </span>
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value}</span>
    </div>
  );
}

function InstanceSummary({ instance }: { instance: RdsInstance }) {
  const endpoint = instance.endpoint;

  return (
    <div className="grid two">
      <div className="widget">
        <div className="widget-header">
          <Database size={13} color="var(--accent)" />
          <h3>Instance</h3>
        </div>
        <div className="widget-body">
          <div className="meta-grid">
            <Meta label="Status" value={instance.status ?? "unknown"} />
            <Meta label="DB name" value={instance.dbName ?? "-"} />
            <Meta label="Engine" value={instance.engine ?? "-"} />
            <Meta label="Engine version" value={instance.engineVersion ?? "-"} />
            <Meta label="Class" value={instance.instanceClass ?? "-"} />
            <Meta label="Master user" value={instance.masterUsername ?? "-"} />
            <Meta label="ARN" value={instance.arn ?? "-"} />
          </div>
        </div>
      </div>

      <div className="widget">
        <div className="widget-header">
          <HardDrive size={13} color="var(--accent)" />
          <h3>Storage</h3>
        </div>
        <div className="widget-body">
          <div className="meta-grid">
            <Meta
              label="Allocated"
              value={
                instance.allocatedStorage !== undefined
                  ? `${instance.allocatedStorage} GB`
                  : "-"
              }
            />
            <Meta label="Storage type" value={instance.storageType ?? "-"} />
            <Meta label="Availability zone" value={instance.availabilityZone ?? "-"} />
            <Meta label="Multi AZ" value={yesNo(instance.multiAz)} />
            <Meta label="Public access" value={yesNo(instance.publiclyAccessible)} />
            <Meta
              label="IAM auth"
              value={yesNo(instance.iamDatabaseAuthenticationEnabled)}
            />
            <Meta
              label="Endpoint"
              value={
                endpoint?.address
                  ? `${endpoint.address}:${endpoint.port ?? ""}`
                  : "-"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NetworkTable({ instance }: { instance: RdsInstance }) {
  const subnets = instance.subnetGroup?.subnets ?? [];

  return (
    <div className="grid two section-space">
      <div className="table-panel">
        <div className="widget-header">
          <Network size={13} color="var(--text-2)" />
          <h3>Security groups</h3>
        </div>
        {instance.vpcSecurityGroups.length === 0 ? (
          <div className="empty compact"><p>No security groups.</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {instance.vpcSecurityGroups.map((group) => (
                <tr key={group.id ?? group.status}>
                  <td className="mono">{group.id ?? "-"}</td>
                  <td>{group.status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-panel">
        <div className="widget-header">
          <Network size={13} color="var(--text-2)" />
          <h3>Subnets</h3>
        </div>
        {subnets.length === 0 ? (
          <div className="empty compact"><p>No subnet group.</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subnet</th>
                <th>AZ</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subnets.map((subnet) => (
                <tr key={subnet.identifier ?? subnet.availabilityZone}>
                  <td className="mono">{subnet.identifier ?? "-"}</td>
                  <td>{subnet.availabilityZone ?? "-"}</td>
                  <td>{subnet.status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateRDSModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [engine, setEngine] = useState("postgres");
  const [instanceClass, setInstanceClass] = useState("db.t3.micro");
  const [allocatedStorage, setAllocatedStorage] = useState("20");
  const [masterUsername, setMasterUsername] = useState("postgres");
  const [masterUserPassword, setMasterUserPassword] = useState("password123");

  const createMutation = useMutation({
    mutationFn: () =>
      rdsClient.createInstance({
        identifier,
        engine,
        instanceClass,
        allocatedStorage: parseInt(allocatedStorage, 10),
        masterUsername,
        masterUserPassword,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (err) =>
      alert(`Create failed: ${err instanceof Error ? err.message : err}`),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create database</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div
          className="modal-body"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label className="label">DB Identifier</label>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="my-database"
              autoFocus
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Engine</label>
              <select
                className="input"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
              >
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mariadb">MariaDB</option>
              </select>
            </div>
            <div>
              <label className="label">Instance class</label>
              <select
                className="input"
                value={instanceClass}
                onChange={(e) => setInstanceClass(e.target.value)}
              >
                <option value="db.t3.micro">db.t3.micro</option>
                <option value="db.t3.small">db.t3.small</option>
                <option value="db.m5.large">db.m5.large</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Master username</label>
              <input
                className="input"
                value={masterUsername}
                onChange={(e) => setMasterUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Master password</label>
              <input
                className="input"
                type="password"
                value={masterUserPassword}
                onChange={(e) => setMasterUserPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Allocated storage (GB)</label>
            <input
              className="input"
              type="number"
              value={allocatedStorage}
              onChange={(e) => setAllocatedStorage(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="button"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="button primary"
            onClick={() => createMutation.mutate()}
            disabled={!identifier.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 size={13} /> : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lifecycle Actions ────────────────────────────────────────────────────────

function InstanceLifecycleActions({ instance }: { instance: RdsInstance }) {
  const qc = useQueryClient();
  
  const startMutation = useMutation({
    mutationFn: () => rdsClient.startInstance(instance.identifier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rds"] }),
  });

  const stopMutation = useMutation({
    mutationFn: () => rdsClient.stopInstance(instance.identifier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rds"] }),
  });

  const rebootMutation = useMutation({
    mutationFn: () => rdsClient.rebootInstance(instance.identifier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rds"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => rdsClient.deleteInstance(instance.identifier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rds"] }),
  });

  const s = instance.status?.toLowerCase();
  const canStart = s === "stopped";
  const canStop = s === "available";
  const canReboot = s === "available";

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      {canStart && (
        <button
          className="button"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? <Loader2 size={13} /> : <Play size={13} />} Start
        </button>
      )}
      {canStop && (
        <button
          className="button"
          onClick={() => stopMutation.mutate()}
          disabled={stopMutation.isPending}
        >
          {stopMutation.isPending ? <Loader2 size={13} /> : <Square size={13} />} Stop
        </button>
      )}
      {canReboot && (
        <button
          className="button"
          onClick={() => rebootMutation.mutate()}
          disabled={rebootMutation.isPending}
        >
          {rebootMutation.isPending ? <Loader2 size={13} /> : <RotateCcw size={13} />} Reboot
        </button>
      )}
      <button
        className="button danger"
        style={{ marginLeft: "auto" }}
        onClick={() => {
          if (confirm(`Delete instance ${instance.identifier}?`)) {
            deleteMutation.mutate();
          }
        }}
        disabled={deleteMutation.isPending || s === "deleting"}
      >
        {deleteMutation.isPending ? <Loader2 size={13} /> : <Trash2 size={13} />} Delete
      </button>
    </div>
  );
}

export function RDSPage() {
  const instancesQuery = useRdsInstancesQuery();
  const instances = useMemo(() => instancesQuery.data ?? [], [instancesQuery.data]);
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!selectedIdentifier && instances[0]) {
      setSelectedIdentifier(instances[0].identifier);
    }
  }, [instances, selectedIdentifier]);

  const selectedFromList = useMemo(
    () =>
      instances.find((instance) => instance.identifier === selectedIdentifier) ??
      null,
    [instances, selectedIdentifier],
  );
  const instanceQuery = useRdsInstanceQuery(selectedIdentifier);
  const selectedInstance = instanceQuery.data ?? selectedFromList;

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h2>RDS</h2>
          <span className="info-link">
            <Info size={11} />
            Database instances
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button primary" onClick={() => setShowCreate(true)}>
            Create database
          </button>
          <button
            className="button"
            onClick={() => {
              void instancesQuery.refetch();
              void instanceQuery.refetch();
            }}
            type="button"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateRDSModal
          onClose={() => setShowCreate(false)}
          onCreated={() => void instancesQuery.refetch()}
        />
      )}

      <div className="split">
        <aside className="list-pane">
          <div className="widget-header">
            <Database size={13} color="var(--text-2)" />
            <h3>Instances ({instances.length})</h3>
          </div>

          {instancesQuery.isLoading ? (
            <div className="empty compact"><p>Loading instances...</p></div>
          ) : instancesQuery.isError ? (
            <EmptyState
              icon={Database}
              title="Cannot load instances"
              description="RDS did not respond from the Floci endpoint."
            />
          ) : instances.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No RDS instances"
              description="No database instances were returned by Floci."
            />
          ) : (
            instances.map((instance) => (
              <InstanceListItem
                key={instance.arn ?? instance.identifier}
                instance={instance}
                active={selectedIdentifier === instance.identifier}
                onSelect={() => setSelectedIdentifier(instance.identifier)}
              />
            ))
          )}
        </aside>

        <section className="detail-pane">
          {!selectedInstance ? (
            <EmptyState
              icon={Database}
              title="Select an instance"
              description="Choose an RDS instance to inspect connection, storage, and networking."
            />
          ) : (
            <div className="content">
              <div className="page-title" style={{ marginBottom: 16 }}>
                <Database size={18} color="var(--accent)" />
                <h2>{selectedInstance.identifier}</h2>
                <span className={`status ${statusClass(selectedInstance.status)}`}>
                  {selectedInstance.status ?? "unknown"}
                </span>
              </div>
              <InstanceLifecycleActions instance={selectedInstance} />
              <div style={{ marginBottom: 16 }} />

              {instanceQuery.isError ? (
                <EmptyState
                  icon={Database}
                  title="Cannot load instance details"
                  description="RDS did not return details for this instance."
                />
              ) : (
                <>
                  <InstanceSummary instance={selectedInstance} />
                  <NetworkTable instance={selectedInstance} />
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
