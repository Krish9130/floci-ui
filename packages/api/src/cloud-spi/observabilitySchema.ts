import type { CapabilitySchema, FieldSchema, ResourceActionName, ServiceSchema, TableColumnSchema } from './types'

const observabilityColumns: TableColumnSchema[] = [
    { name: 'name', label: 'Log Group' },
    { name: 'type', label: 'Type' },
    { name: 'createdAt', label: 'Created' },
]

const observabilityFilters: FieldSchema[] = [
    { name: 'search', label: 'Search', type: 'text', required: false },
]

const observabilityResourceActions: CapabilitySchema<ResourceActionName>[] = [
    { name: 'list', label: 'List log groups', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'create', label: 'Create log group', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'delete', label: 'Delete log group', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'inspect', label: 'Inspect log group', enabled: true, status: 'available', runtimeRequired: false },
]

export function awsObservabilitySchema(): ServiceSchema {
    return {
        cloud: 'aws',
        service: 'observability',
        displayName: 'CloudWatch Log Groups',
        fields: [
            {
                name: 'logGroupName',
                label: 'Log Group Name',
                type: 'text',
                required: true,
                description: 'Must start with /. Up to 512 characters.',
                validation: {
                    pattern: '^[\\.\\-_/#A-Za-z0-9]+$',
                    minLength: 1,
                    maxLength: 512,
                    message: 'Use a valid log group name. Allowed: letters, numbers, and /.-_#.',
                },
            },
        ],
        actions: ['list', 'create', 'delete', 'inspect'],
        capabilities: {
            resourceActions: observabilityResourceActions,
        },
        filters: observabilityFilters,
        columns: observabilityColumns,
    }
}
