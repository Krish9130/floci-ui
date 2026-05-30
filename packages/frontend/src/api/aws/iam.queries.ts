import { useQuery } from "@tanstack/react-query";
import { iamClient } from "./iam.api";

export const iamQueryKeys = {
  roles: ["iam", "roles"] as const,
  users: ["iam", "users"] as const,
  policies: ["iam", "policies"] as const,
};

export function useIamRolesQuery() {
  return useQuery({
    queryKey: iamQueryKeys.roles,
    queryFn: ({ signal }) => iamClient.listRoles(signal),
    refetchInterval: 60_000,
  });
}

export function useIamUsersQuery() {
  return useQuery({
    queryKey: iamQueryKeys.users,
    queryFn: ({ signal }) => iamClient.listUsers(signal),
    refetchInterval: 60_000,
  });
}

export function useIamPoliciesQuery() {
  return useQuery({
    queryKey: iamQueryKeys.policies,
    queryFn: ({ signal }) => iamClient.listPolicies(signal),
    refetchInterval: 60_000,
  });
}
