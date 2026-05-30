import {
  SecretsManagerClient,
  ListSecretsCommand,
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  type SecretListEntry,
} from "@aws-sdk/client-secrets-manager";
import { awsClients } from "../aws";

export type SMSecret = {
  arn: string;
  name: string;
  description?: string;
  lastChangedDate?: string;
  tags?: Record<string, string>;
};

function toSMSecret(secret: SecretListEntry): SMSecret {
  const tags: Record<string, string> = {};
  if (secret.Tags) {
    for (const tag of secret.Tags) {
      if (tag.Key && tag.Value) {
        tags[tag.Key] = tag.Value;
      }
    }
  }

  return {
    arn: secret.ARN ?? "",
    name: secret.Name ?? "",
    description: secret.Description,
    lastChangedDate: secret.LastChangedDate?.toISOString(),
    tags,
  };
}

export function createSecretsManagerService(
  client: SecretsManagerClient = awsClients.secretsManager
) {
  return {
    async listSecrets(): Promise<SMSecret[]> {
      const res = await client.send(new ListSecretsCommand({ MaxResults: 100 }));
      return (res.SecretList ?? []).map(toSMSecret);
    },

    async createSecret(name: string, value: string, description?: string): Promise<string> {
      const res = await client.send(
        new CreateSecretCommand({
          Name: name,
          SecretString: value,
          Description: description,
        })
      );
      return res.ARN ?? "";
    },

    async getSecretValue(secretId: string): Promise<string> {
      const res = await client.send(
        new GetSecretValueCommand({ SecretId: secretId })
      );
      return res.SecretString ?? "";
    },

    async deleteSecret(secretId: string): Promise<void> {
      await client.send(
        new DeleteSecretCommand({
          SecretId: secretId,
          ForceDeleteWithoutRecovery: true,
        })
      );
    },
  };
}

export const secretsManagerService = createSecretsManagerService();
