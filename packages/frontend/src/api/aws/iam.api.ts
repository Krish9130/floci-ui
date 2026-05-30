import { apiClient, apiEndpointKeys } from "@/api/api";

export type IamRole = {
  id: string;
  name: string;
  arn: string;
  createDate?: string;
  description?: string;
};

export type IamUser = {
  id: string;
  name: string;
  arn: string;
  createDate?: string;
};

export type IamPolicy = {
  id: string;
  name: string;
  arn: string;
  createDate?: string;
  updateDate?: string;
  attachmentCount?: number;
};

export async function listIamRoles(signal?: AbortSignal): Promise<IamRole[]> {
  const res = await apiClient.call<IamRole[]>(
    apiEndpointKeys.aws.iam.roles.list,
    { signal }
  );
  return res.data;
}

export async function listIamUsers(signal?: AbortSignal): Promise<IamUser[]> {
  const res = await apiClient.call<IamUser[]>(
    apiEndpointKeys.aws.iam.users.list,
    { signal }
  );
  return res.data;
}

export async function listIamPolicies(signal?: AbortSignal): Promise<IamPolicy[]> {
  const res = await apiClient.call<IamPolicy[]>(
    apiEndpointKeys.aws.iam.policies.list,
    { signal }
  );
  return res.data;
}

export const iamClient = {
  listRoles: listIamRoles,
  listUsers: listIamUsers,
  listPolicies: listIamPolicies,
};
