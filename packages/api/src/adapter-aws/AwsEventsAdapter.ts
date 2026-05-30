import { ListTopicsCommand, CreateTopicCommand, DeleteTopicCommand } from '@aws-sdk/client-sns'
import { sns } from '../aws'
import { awsEventsSchema } from '../cloud-spi/eventsSchema'
import type {
    CloudResource,
    CloudServiceAdapter,
    CreateResourceInput,
    ResourceQuery,
    ServiceSchema,
} from '../cloud-spi/types'

export class AwsEventsAdapter implements CloudServiceAdapter {
    readonly cloud = 'aws' as const
    readonly service = 'events' as const

    schema(): ServiceSchema {
        return awsEventsSchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const topics: CloudResource[] = []
        let nextToken: string | undefined

        do {
            const res = await sns.send(new ListTopicsCommand({ NextToken: nextToken }))
            for (const topic of res.Topics ?? []) {
                const arn = topic.TopicArn ?? ''
                const name = arn.split(':').pop() ?? arn
                const isFifo = name.endsWith('.fifo')
                topics.push({
                    id: arn,
                    name,
                    cloud: 'aws',
                    service: 'events',
                    type: 'topic',
                    region: null,
                    createdAt: null,
                    status: 'active',
                    metadata: {
                        arn,
                        topicType: isFifo ? 'FIFO' : 'Standard',
                        fifo: isFifo,
                    },
                })
            }
            nextToken = res.NextToken
        } while (nextToken)

        return filterBySearch(topics, query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        const all = await this.list()
        return all.find((r) => r.id === id) ?? null
    }

    async create(input: CreateResourceInput): Promise<CloudResource> {
        const topicName = stringValue(input.values.topicName)
        if (!topicName) throw new Error('topicName is required')
        const fifo = input.values.fifo === 'true' || input.values.fifo === true
        const effectiveName = fifo && !topicName.endsWith('.fifo') ? `${topicName}.fifo` : topicName

        const res = await sns.send(new CreateTopicCommand({
            Name: effectiveName,
            Attributes: fifo ? { FifoTopic: 'true' } : undefined,
        }))

        const arn = res.TopicArn ?? effectiveName
        return {
            id: arn,
            name: effectiveName,
            cloud: 'aws',
            service: 'events',
            type: 'topic',
            region: null,
            createdAt: new Date().toISOString(),
            status: 'active',
            metadata: {
                arn,
                topicType: fifo ? 'FIFO' : 'Standard',
                fifo,
            },
        }
    }

    async delete(id: string): Promise<void> {
        await sns.send(new DeleteTopicCommand({ TopicArn: id }))
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
