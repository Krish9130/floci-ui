import { apiClient, apiEndpointKeys } from "@/api/api";
import type { ResourceSummary } from "@/api/types";

export type RdsEndpoint = {
  address?: string;
  port?: number;
  hostedZoneId?: string;
};

export type RdsVpcSecurityGroup = {
  id?: string;
  status?: string;
};

export type RdsSubnet = {
  identifier?: string;
  availabilityZone?: string;
  status?: string;
};

export type RdsDbSubnetGroup = {
  name?: string;
  vpcId?: string;
  status?: string;
  subnets: RdsSubnet[];
};

export type RdsInstance = {
  identifier: string;
  arn?: string;
  resourceId?: string;
  createdAt?: string;
  status?: string;
  engine?: string;
  engineVersion?: string;
  instanceClass?: string;
  dbName?: string;
  masterUsername?: string;
  allocatedStorage?: number;
  storageType?: string;
  availabilityZone?: string;
  multiAz?: boolean;
  publiclyAccessible?: boolean;
  iamDatabaseAuthenticationEnabled?: boolean;
  preferredBackupWindow?: string;
  preferredMaintenanceWindow?: string;
  endpoint?: RdsEndpoint;
  vpcSecurityGroups: RdsVpcSecurityGroup[];
  subnetGroup?: RdsDbSubnetGroup;
};

export type RdsSnapshot = {
  identifier: string;
  instanceIdentifier?: string;
  arn?: string;
  status?: string;
  engine?: string;
  engineVersion?: string;
  allocatedStorage?: number;
  snapshotType?: string;
  createdAt?: string;
  port?: number;
  availabilityZone?: string;
  vpcId?: string;
};

export async function listRdsInstances(
  signal?: AbortSignal,
): Promise<RdsInstance[]> {
  const res = await apiClient.call<RdsInstance[]>(
    apiEndpointKeys.aws.rds.instances.list,
    { signal },
  );

  return res.data;
}

export async function describeRdsInstance(
  identifier: string,
  signal?: AbortSignal,
): Promise<RdsInstance> {
  const res = await apiClient.call<RdsInstance>(
    apiEndpointKeys.aws.rds.instances.describe,
    { signal },
    { identifier },
  );

  return res.data;
}

export async function listRdsSnapshots(
  instanceIdentifier?: string,
  signal?: AbortSignal,
): Promise<RdsSnapshot[]> {
  const res = await apiClient.call<RdsSnapshot[]>(
    apiEndpointKeys.aws.rds.snapshots.list,
    {
      signal,
      params: instanceIdentifier ? { instanceIdentifier } : undefined,
    },
  );

  return res.data;
}

export async function createRdsSnapshot(
  instanceIdentifier: string,
  snapshotIdentifier?: string,
  signal?: AbortSignal,
): Promise<RdsSnapshot> {
  const res = await apiClient.call<
    RdsSnapshot,
    { instanceIdentifier: string; snapshotIdentifier?: string }
  >(
    apiEndpointKeys.aws.rds.snapshots.create,
    {
      signal,
      body: { instanceIdentifier, snapshotIdentifier },
    },
  );

  return res.data;
}

export async function listRdsResources(
  signal?: AbortSignal,
): Promise<ResourceSummary[]> {
  const instances = await listRdsInstances(signal);

  return instances.map((instance) => ({
    id: instance.arn ?? instance.identifier,
    name: instance.identifier,
    status: instance.status,
    description: instance.dbName,
    metadata: {
      engine: instance.engine,
      version: instance.engineVersion,
      class: instance.instanceClass,
      endpoint: instance.endpoint?.address,
      port: instance.endpoint?.port,
    },
  }));
}

export async function createRdsInstance(
  params: {
    identifier: string;
    engine: string;
    instanceClass: string;
    allocatedStorage: number;
    masterUsername: string;
    masterUserPassword?: string;
  },
  signal?: AbortSignal,
): Promise<RdsInstance> {
  const res = await apiClient.call<RdsInstance, typeof params>(
    apiEndpointKeys.aws.rds.instances.create,
    { signal, body: params },
  );
  return res.data;
}

export async function startRdsInstance(
  identifier: string,
  signal?: AbortSignal,
): Promise<RdsInstance> {
  const res = await apiClient.call<RdsInstance>(
    apiEndpointKeys.aws.rds.instances.start,
    { signal },
    { identifier },
  );
  return res.data;
}

export async function stopRdsInstance(
  identifier: string,
  signal?: AbortSignal,
): Promise<RdsInstance> {
  const res = await apiClient.call<RdsInstance>(
    apiEndpointKeys.aws.rds.instances.stop,
    { signal },
    { identifier },
  );
  return res.data;
}

export async function rebootRdsInstance(
  identifier: string,
  signal?: AbortSignal,
): Promise<RdsInstance> {
  const res = await apiClient.call<RdsInstance>(
    apiEndpointKeys.aws.rds.instances.reboot,
    { signal },
    { identifier },
  );
  return res.data;
}

export async function deleteRdsInstance(
  identifier: string,
  signal?: AbortSignal,
): Promise<RdsInstance> {
  const res = await apiClient.call<RdsInstance>(
    apiEndpointKeys.aws.rds.instances.delete,
    { signal },
    { identifier },
  );
  return res.data;
}

export const rdsClient = {
  listInstances: listRdsInstances,
  describeInstance: describeRdsInstance,
  createInstance: createRdsInstance,
  startInstance: startRdsInstance,
  stopInstance: stopRdsInstance,
  rebootInstance: rebootRdsInstance,
  deleteInstance: deleteRdsInstance,
  listSnapshots: listRdsSnapshots,
  createSnapshot: createRdsSnapshot,
  listResources: listRdsResources,
};
