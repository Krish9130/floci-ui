import {
  IAMClient,
  ListRolesCommand,
  ListUsersCommand,
  ListPoliciesCommand,
  type Role,
  type User,
  type Policy,
} from "@aws-sdk/client-iam";
import { awsClients } from "../aws";

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

function toIamRole(role: Role): IamRole {
  return {
    id: role.RoleId ?? "",
    name: role.RoleName ?? "",
    arn: role.Arn ?? "",
    createDate: role.CreateDate?.toISOString(),
    description: role.Description,
  };
}

function toIamUser(user: User): IamUser {
  return {
    id: user.UserId ?? "",
    name: user.UserName ?? "",
    arn: user.Arn ?? "",
    createDate: user.CreateDate?.toISOString(),
  };
}

function toIamPolicy(policy: Policy): IamPolicy {
  return {
    id: policy.PolicyId ?? "",
    name: policy.PolicyName ?? "",
    arn: policy.Arn ?? "",
    createDate: policy.CreateDate?.toISOString(),
    updateDate: policy.UpdateDate?.toISOString(),
    attachmentCount: policy.AttachmentCount,
  };
}

export function createIamService(client: IAMClient = awsClients.iam) {
  return {
    async listRoles(): Promise<IamRole[]> {
      const res = await client.send(new ListRolesCommand({ MaxItems: 100 }));
      return (res.Roles ?? []).map(toIamRole);
    },
    async listUsers(): Promise<IamUser[]> {
      const res = await client.send(new ListUsersCommand({ MaxItems: 100 }));
      return (res.Users ?? []).map(toIamUser);
    },
    async listPolicies(): Promise<IamPolicy[]> {
      const res = await client.send(
        new ListPoliciesCommand({ Scope: "Local", MaxItems: 100 })
      );
      return (res.Policies ?? []).map(toIamPolicy);
    },
  };
}

export const iamService = createIamService();
