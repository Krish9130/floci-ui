import { ListQueuesCommand, GetQueueAttributesCommand, CreateQueueCommand, DeleteQueueCommand } from '@aws-sdk/client-sqs'
import { sqs } from '../aws'
import { awsQueueSchema } from '../cloud-spi/queueSchema'
import type {
    CloudResource,
    CloudServiceAdapter,
    CreateResourceInput,
    ResourceQuery,
    ServiceSchema,
} from '../cloud-spi/types'

export class AwsQueueAdapter implements CloudServiceAdapter {
    readonly cloud = 'aws' as const
    readonly service = 'queue' as const

    schema(): ServiceSchema {
        return awsQueueSchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const res = await sqs.send(new ListQueuesCommand({ MaxResults: 1000 }))
        const urls = res.QueueUrls ?? []

        const resources = await Promise.all(
            urls.map(async (url): Promise<CloudResource> => {
                const name = url.split('/').pop() ?? url
                let createdAt: string | null = null
                let messageCount: string | null = null
                let fifo = false

                try {
                    const attrs = await sqs.send(new GetQueueAttributesCommand({
                        QueueUrl: url,
                        AttributeNames: [
                            'CreatedTimestamp',
                            'ApproximateNumberOfMessages',
                            'FifoQueue',
                            'QueueArn',
                        ],
                    }))
                    const a = attrs.Attributes ?? {}
                    if (a.CreatedTimestamp) {
                        createdAt = new Date(Number(a.CreatedTimestamp) * 1000).toISOString()
                    }
                    messageCount = a.ApproximateNumberOfMessages ?? null
                    fifo = a.FifoQueue === 'true'
                } catch {
                    // best-effort — use null values if attributes are unavailable
                }

                return {
                    id: url,
                    name,
                    cloud: 'aws',
                    service: 'queue',
                    type: 'queue',
                    region: null,
                    createdAt,
                    status: 'active',
                    metadata: {
                        url,
                        fifo,
                        messageCount,
                        queueType: fifo ? 'FIFO' : 'Standard',
                    },
                }
            })
        )

        return filterBySearch(resources, query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        const all = await this.list()
        return all.find((r) => r.id === id) ?? null
    }

    async create(input: CreateResourceInput): Promise<CloudResource> {
        const queueName = stringValue(input.values.queueName)
        if (!queueName) throw new Error('queueName is required')

        const fifo = input.values.fifo === 'true' || input.values.fifo === true
        const effectiveName = fifo && !queueName.endsWith('.fifo') ? `${queueName}.fifo` : queueName

        const res = await sqs.send(new CreateQueueCommand({
            QueueName: effectiveName,
            Attributes: fifo ? { FifoQueue: 'true' } : undefined,
        }))

        const url = res.QueueUrl ?? effectiveName
        return {
            id: url,
            name: effectiveName,
            cloud: 'aws',
            service: 'queue',
            type: 'queue',
            region: null,
            createdAt: new Date().toISOString(),
            status: 'active',
            metadata: {
                url,
                fifo,
                messageCount: '0',
                queueType: fifo ? 'FIFO' : 'Standard',
            },
        }
    }

    async delete(id: string): Promise<void> {
        await sqs.send(new DeleteQueueCommand({ QueueUrl: id }))
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
