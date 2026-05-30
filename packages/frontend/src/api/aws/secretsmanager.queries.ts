import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secretsManagerClient } from "./secretsmanager.api";

export const smQueryKeys = {
  all: ["secretsmanager"] as const,
  secrets: () => [...smQueryKeys.all, "secrets"] as const,
  secretValue: (id: string) => [...smQueryKeys.secrets(), id, "value"] as const,
};

export function useSecretsQuery() {
  return useQuery({
    queryKey: smQueryKeys.secrets(),
    queryFn: ({ signal }) => secretsManagerClient.listSecrets(signal),
    refetchInterval: 60_000,
  });
}

export function useSecretValueQuery(secretId: string, enabled = false) {
  return useQuery({
    queryKey: smQueryKeys.secretValue(secretId),
    queryFn: ({ signal }) => secretsManagerClient.getSecretValue(secretId, signal),
    enabled: enabled && !!secretId,
  });
}

export function useCreateSecretMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; value: string; description?: string }) =>
      secretsManagerClient.createSecret(data.name, data.value, data.description),
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: smQueryKeys.secrets() });
    },
  });
}

export function useDeleteSecretMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (secretId: string) => secretsManagerClient.deleteSecret(secretId),
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: smQueryKeys.secrets() });
    },
  });
}
