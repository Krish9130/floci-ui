import { useState } from "react";
import { Key, Users, FileSignature, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  useIamRolesQuery,
  useIamUsersQuery,
  useIamPoliciesQuery,
} from "@/api/aws/iam.queries";
import type { IamRole, IamUser, IamPolicy } from "@/api/aws/iam.api";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RoleTable({ roles }: { roles: IamRole[] }) {
  if (roles.length === 0) {
    return (
      <EmptyState
        icon={Key}
        title="No IAM Roles"
        description="No roles found."
      />
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>ID</th>
          <th>Created</th>
          <th>ARN</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.id}>
            <td><strong>{r.name}</strong></td>
            <td className="mono">{r.id}</td>
            <td>{formatDate(r.createDate)}</td>
            <td className="mono" style={{ fontSize: "0.85em" }}>{r.arn}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UserTable({ users }: { users: IamUser[] }) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No IAM Users"
        description="No users found."
      />
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>ID</th>
          <th>Created</th>
          <th>ARN</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td><strong>{u.name}</strong></td>
            <td className="mono">{u.id}</td>
            <td>{formatDate(u.createDate)}</td>
            <td className="mono" style={{ fontSize: "0.85em" }}>{u.arn}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PolicyTable({ policies }: { policies: IamPolicy[] }) {
  if (policies.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        title="No IAM Policies"
        description="No local policies found."
      />
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>ID</th>
          <th>Attached</th>
          <th>Created</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {policies.map((p) => (
          <tr key={p.id}>
            <td><strong>{p.name}</strong></td>
            <td className="mono">{p.id}</td>
            <td>{p.attachmentCount ?? 0}</td>
            <td>{formatDate(p.createDate)}</td>
            <td>{formatDate(p.updateDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function IAMPage() {
  const [tab, setTab] = useState<"roles" | "users" | "policies">("roles");
  
  const rolesQuery = useIamRolesQuery();
  const usersQuery = useIamUsersQuery();
  const policiesQuery = useIamPoliciesQuery();

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <h2>IAM</h2>
          <span className="info-link">
            Identity and Access Management
          </span>
        </div>
        <button
          className="button"
          onClick={() => {
            void rolesQuery.refetch();
            void usersQuery.refetch();
            void policiesQuery.refetch();
          }}
          type="button"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: 24, display: "flex", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
        <button
          className={`tab ${tab === "roles" ? "active" : ""}`}
          onClick={() => setTab("roles")}
          style={{ background: "none", border: "none", color: tab === "roles" ? "var(--accent)" : "inherit", fontWeight: tab === "roles" ? 600 : 400, cursor: "pointer" }}
        >
          <Key size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} />
          Roles ({rolesQuery.data?.length ?? 0})
        </button>
        <button
          className={`tab ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
          style={{ background: "none", border: "none", color: tab === "users" ? "var(--accent)" : "inherit", fontWeight: tab === "users" ? 600 : 400, cursor: "pointer" }}
        >
          <Users size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} />
          Users ({usersQuery.data?.length ?? 0})
        </button>
        <button
          className={`tab ${tab === "policies" ? "active" : ""}`}
          onClick={() => setTab("policies")}
          style={{ background: "none", border: "none", color: tab === "policies" ? "var(--accent)" : "inherit", fontWeight: tab === "policies" ? 600 : 400, cursor: "pointer" }}
        >
          <FileSignature size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} />
          Policies ({policiesQuery.data?.length ?? 0})
        </button>
      </div>

      <div className="table-panel">
        {tab === "roles" && (
          rolesQuery.isLoading ? <p style={{ padding: 24 }}>Loading roles...</p> :
          rolesQuery.isError ? <EmptyState icon={Key} title="Error" description="Failed to load roles." /> :
          <RoleTable roles={rolesQuery.data ?? []} />
        )}
        {tab === "users" && (
          usersQuery.isLoading ? <p style={{ padding: 24 }}>Loading users...</p> :
          usersQuery.isError ? <EmptyState icon={Users} title="Error" description="Failed to load users." /> :
          <UserTable users={usersQuery.data ?? []} />
        )}
        {tab === "policies" && (
          policiesQuery.isLoading ? <p style={{ padding: 24 }}>Loading policies...</p> :
          policiesQuery.isError ? <EmptyState icon={FileSignature} title="Error" description="Failed to load policies." /> :
          <PolicyTable policies={policiesQuery.data ?? []} />
        )}
      </div>
    </>
  );
}
