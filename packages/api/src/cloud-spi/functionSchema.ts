import type { CapabilitySchema, FieldSchema, ResourceActionName, ServiceSchema, TableColumnSchema } from './types'

const functionColumns: TableColumnSchema[] = [
    { name: 'name', label: 'Name' },
    { name: 'type', label: 'Type' },
    { name: 'status', label: 'Runtime' },
    { name: 'createdAt', label: 'Last Modified' },
]

const functionFilters: FieldSchema[] = [
    { name: 'search', label: 'Search', type: 'text', required: false },
]

const functionResourceActions: CapabilitySchema<ResourceActionName>[] = [
    { name: 'list', label: 'List functions', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'create', label: 'Create function', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'delete', label: 'Delete function', enabled: true, status: 'available', runtimeRequired: true },
    { name: 'inspect', label: 'Inspect function', enabled: true, status: 'available', runtimeRequired: false },
]

export function awsFunctionSchema(): ServiceSchema {
    return {
        cloud: 'aws',
        service: 'function',
        displayName: 'Lambda Functions',
        fields: [
            {
                name: 'functionName',
                label: 'Function Name',
                type: 'text',
                required: true,
                description: '1-64 characters. Letters, numbers, hyphens, and underscores.',
                validation: {
                    pattern: '^[a-zA-Z0-9_-]{1,64}$',
                    minLength: 1,
                    maxLength: 64,
                    message: 'Function name must be 1-64 alphanumeric characters, hyphens, or underscores.',
                },
            },
            {
                name: 'runtime',
                label: 'Runtime',
                type: 'select',
                required: true,
                options: [
                    { label: 'Node.js 20', value: 'nodejs20.x' },
                    { label: 'Node.js 18', value: 'nodejs18.x' },
                    { label: 'Python 3.12', value: 'python3.12' },
                    { label: 'Python 3.11', value: 'python3.11' },
                    { label: 'Python 3.10', value: 'python3.10' },
                ],
            },
        ],
        actions: ['list', 'create', 'delete', 'inspect'],
        capabilities: {
            resourceActions: functionResourceActions,
        },
        filters: functionFilters,
        columns: functionColumns,
    }
}
