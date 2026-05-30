import { apiGet, apiPost, apiDelete } from "../floci-client";

export type SMSecret = {
  arn: string;
  name: string;
  description?: string;
  lastChangedDate?: string;
  tags?: Record<string, string>;
};

export async function listSecrets(signal?: AbortSignal): Promise<SMSecret[]> {
  return apiGet<SMSecret[]>("/secretsmanager/secrets", "secretsmanager", signal);
}

export async function createSecret(
  name: string,
  value: string,
  description?: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await apiPost<{ arn: string }>(
    "/secretsmanager/secrets",
    "secretsmanager",
    { name, value, description },
    signal
  );
  return res.arn;
}

export async function getSecretValue(
  secretId: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await apiGet<{ value: string }>(
    `/secretsmanager/secrets/${encodeURIComponent(secretId)}/value`,
    "secretsmanager",
    signal
  );
  return res.value;
}

export async function deleteSecret(
  secretId: string,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(
    `/secretsmanager/secrets/${encodeURIComponent(secretId)}`,
    "secretsmanager",
    signal
  );
}

export const secretsManagerClient = {
  listSecrets,
  createSecret,
  getSecretValue,
  deleteSecret,
};
