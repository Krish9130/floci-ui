import type { CapabilitySchema, FieldSchema, ResourceActionName, ServiceSchema, TableColumnSchema } from './types'

const queueColumns: TableColumnSchema[] = [
    { name: 'name', label: 'Name' },
    { name: 'type', label: 'Type' },
    { name: 'status', label: 'Status' },
    { name: 'createdAt', label: 'Created' },
]

const queueFilters: FieldSchema[] = [
    { name: 'search', label: 'Search', type: 'text', required: false },
]

const queueResourceActions: CapabilitySchema<ResourceActionName>[] = [
    { name: 'list', label: 'List queues', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'create', label: 'Create queue', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'delete', label: 'Delete queue', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'inspect', label: 'Inspect queue', enabled: true, status: 'available', runtimeRequired: false },
]

export function awsQueueSchema(): ServiceSchema {
    return {
        cloud: 'aws',
        service: 'queue',
        displayName: 'SQS Queues',
        fields: [
            {
                name: 'queueName',
                label: 'Queue Name',
                type: 'text',
                required: true,
                description: '1-80 characters. Letters, numbers, hyphens, and underscores. Append .fifo for FIFO queues.',
                validation: {
                    pattern: '^[a-zA-Z0-9_-]{1,80}(\\.fifo)?$',
                    minLength: 1,
                    maxLength: 80,
                    message: 'Queue name must be 1-80 alphanumeric characters, hyphens, or underscores.',
                },
            },
            {
                name: 'fifo',
                label: 'FIFO Queue',
                type: 'select',
                required: false,
                options: [
                    { label: 'Standard', value: 'false' },
                    { label: 'FIFO (ordered, exactly-once)', value: 'true' },
                ],
            },
        ],
        actions: ['list', 'create', 'delete', 'inspect'],
        capabilities: {
            resourceActions: queueResourceActions,
        },
        filters: queueFilters,
        columns: queueColumns,
    }
}
