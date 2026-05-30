import {
    CreateLogGroupCommand,
    DeleteLogGroupCommand,
    DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs'
import { cwLogs } from '../aws'
import { awsObservabilitySchema } from '../cloud-spi/observabilitySchema'
import type {
    CloudResource,
    CloudServiceAdapter,
    CreateResourceInput,
    ResourceQuery,
    ServiceSchema,
} from '../cloud-spi/types'

export class AwsObservabilityAdapter implements CloudServiceAdapter {
    readonly cloud = 'aws' as const
    readonly service = 'observability' as const

    schema(): ServiceSchema {
        return awsObservabilitySchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const groups: CloudResource[] = []
        let nextToken: string | undefined

        do {
            const res = await cwLogs.send(new DescribeLogGroupsCommand({
                nextToken,
                limit: 50,
            }))
            for (const group of res.logGroups ?? []) {
                const name = group.logGroupName ?? ''
                groups.push({
                    id: group.logGroupArn ?? name,
                    name,
                    cloud: 'aws',
                    service: 'observability',
                    type: 'log-group',
                    region: null,
                    createdAt: group.creationTime
                        ? new Date(group.creationTime).toISOString()
                        : null,
                    status: 'active',
                    metadata: {
                        arn: group.logGroupArn,
                        retentionDays: group.retentionInDays ?? null,
                        storedBytes: group.storedBytes ?? 0,
                        metricFilterCount: group.metricFilterCount ?? 0,
                    },
                })
            }
            nextToken = res.nextToken
        } while (nextToken)

        return filterBySearch(groups, query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        const all = await this.list()
        return all.find((r) => r.id === id) ?? null
    }

    async create(input: CreateResourceInput): Promise<CloudResource> {
        const logGroupName = stringValue(input.values.logGroupName)
        if (!logGroupName) throw new Error('logGroupName is required')

        await cwLogs.send(new CreateLogGroupCommand({ logGroupName }))

        return {
            id: logGroupName,
            name: logGroupName,
            cloud: 'aws',
            service: 'observability',
            type: 'log-group',
            region: null,
            createdAt: new Date().toISOString(),
            status: 'active',
            metadata: {
                retentionDays: null,
                storedBytes: 0,
                metricFilterCount: 0,
            },
        }
    }

    async delete(id: string): Promise<void> {
        // id could be ARN or name — extract name
        const name = id.includes(':log-group:') ? id.split(':log-group:')[1].split(':')[0] : id
        await cwLogs.send(new DeleteLogGroupCommand({ logGroupName: name }))
    }
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

function filterBySearch(resources: CloudResource[], search?: string): CloudResource[] {
    const normalized = search?.trim().toLowerCase()
    if (!normalized) return resources
    return resources.filter((r) => r.name.toLowerCase().includes(normalized))
}
