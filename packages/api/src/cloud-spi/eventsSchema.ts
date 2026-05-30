import type { CapabilitySchema, FieldSchema, ResourceActionName, ServiceSchema, TableColumnSchema } from './types'

const eventsColumns: TableColumnSchema[] = [
    { name: 'name', label: 'Name' },
    { name: 'type', label: 'Type' },
    { name: 'createdAt', label: 'Created' },
]

const eventsFilters: FieldSchema[] = [
    { name: 'search', label: 'Search', type: 'text', required: false },
]

const eventsResourceActions: CapabilitySchema<ResourceActionName>[] = [
    { name: 'list', label: 'List topics', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'create', label: 'Create topic', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'delete', label: 'Delete topic', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'inspect', label: 'Inspect topic', enabled: true, status: 'available', runtimeRequired: false },
]

export function awsEventsSchema(): ServiceSchema {
    return {
        cloud: 'aws',
        service: 'events',
        displayName: 'SNS Topics',
        fields: [
            {
                name: 'topicName',
                label: 'Topic Name',
                type: 'text',
                required: true,
                description: '1-256 characters. Letters, numbers, hyphens, and underscores.',
                validation: {
                    pattern: '^[a-zA-Z0-9_-]{1,256}$',
                    minLength: 1,
                    maxLength: 256,
                    message: 'Topic name must be 1-256 alphanumeric characters, hyphens, or underscores.',
                },
            },
            {
                name: 'fifo',
                label: 'Topic Type',
                type: 'select',
                required: false,
                options: [
                    { label: 'Standard', value: 'false' },
                    { label: 'FIFO', value: 'true' },
                ],
            },
        ],
        actions: ['list', 'create', 'delete', 'inspect'],
        capabilities: {
            resourceActions: eventsResourceActions,
        },
        filters: eventsFilters,
        columns: eventsColumns,
    }
}
