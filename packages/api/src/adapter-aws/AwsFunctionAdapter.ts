import {
    CreateFunctionCommand,
    DeleteFunctionCommand,
    ListFunctionsCommand,
    Runtime,
} from '@aws-sdk/client-lambda'
import { lambda } from '../aws'
import { awsFunctionSchema } from '../cloud-spi/functionSchema'
import type {
    CloudResource,
    CloudServiceAdapter,
    CreateResourceInput,
    ResourceQuery,
    ServiceSchema,
} from '../cloud-spi/types'

export class AwsFunctionAdapter implements CloudServiceAdapter {
    readonly cloud = 'aws' as const
    readonly service = 'function' as const

    schema(): ServiceSchema {
        return awsFunctionSchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const functions: CloudResource[] = []
        let marker: string | undefined

        do {
            const res = await lambda.send(new ListFunctionsCommand({
                Marker: marker,
                MaxItems: 50,
            }))
            for (const fn of res.Functions ?? []) {
                functions.push({
                    id: fn.FunctionArn ?? fn.FunctionName ?? '',
                    name: fn.FunctionName ?? '',
                    cloud: 'aws',
                    service: 'function',
                    type: 'function',
                    region: null,
                    createdAt: fn.LastModified ?? null,
                    status: fn.State ?? 'Active',
                    metadata: {
                        arn: fn.FunctionArn,
                        runtime: fn.Runtime,
                        handler: fn.Handler,
                        memorySizeMb: fn.MemorySize,
                        timeoutSeconds: fn.Timeout,
                        role: fn.Role,
                        description: fn.Description || null,
                        codeSize: fn.CodeSize,
                    },
                })
            }
            marker = res.NextMarker
        } while (marker)

        return filterBySearch(functions, query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        const all = await this.list()
        return all.find((r) => r.id === id) ?? null
    }

    async create(input: CreateResourceInput): Promise<CloudResource> {
        const functionName = stringValue(input.values.functionName)
        if (!functionName) throw new Error('functionName is required')
        const runtime = (stringValue(input.values.runtime) || 'nodejs20.x') as Runtime

        // Create a minimal inline zip for local Floci — empty handler
        const code = Buffer.from(
            'exports.handler = async (event) => ({ statusCode: 200, body: "Hello from Floci!" });'
        )
        // Minimal valid zip with the handler file
        const { zipBuffer } = await buildZip('index.js', code)

        const res = await lambda.send(new CreateFunctionCommand({
            FunctionName: functionName,
            Runtime: runtime,
            Handler: 'index.handler',
            Role: 'arn:aws:iam::000000000000:role/lambda-role',
            Code: { ZipFile: zipBuffer },
        }))

        return {
            id: res.FunctionArn ?? functionName,
            name: functionName,
            cloud: 'aws',
            service: 'function',
            type: 'function',
            region: null,
            createdAt: res.LastModified ?? new Date().toISOString(),
            status: res.State ?? 'Active',
            metadata: {
                arn: res.FunctionArn,
                runtime: res.Runtime,
                handler: res.Handler,
                memorySizeMb: res.MemorySize,
                timeoutSeconds: res.Timeout,
                role: res.Role,
            },
        }
    }

    async delete(id: string): Promise<void> {
        // id is the ARN; extract function name
        const name = id.includes(':function:') ? id.split(':function:')[1] : id
        await lambda.send(new DeleteFunctionCommand({ FunctionName: name }))
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

/** Build a minimal ZIP archive in memory without any native dependencies */
async function buildZip(filename: string, content: Buffer): Promise<{ zipBuffer: Uint8Array }> {
    // Use the local-only path of creating a simple ZIP via pure TypeScript
    // We build the structure manually: local file header + data + central dir + end-of-central-dir
    const encoder = new TextEncoder()
    const nameBytes = encoder.encode(filename)
    const nameLen = nameBytes.length
    const dataLen = content.length

    // Local file header
    const localHeader = Buffer.alloc(30 + nameLen)
    localHeader.writeUInt32LE(0x04034b50, 0) // signature
    localHeader.writeUInt16LE(20, 4)  // version needed
    localHeader.writeUInt16LE(0, 6)   // flags
    localHeader.writeUInt16LE(0, 8)   // no compression
    localHeader.writeUInt16LE(0, 10)  // mod time
    localHeader.writeUInt16LE(0, 12)  // mod date
    localHeader.writeUInt32LE(0, 14)  // CRC-32 (skip for local Floci)
    localHeader.writeUInt32LE(dataLen, 18)  // compressed size
    localHeader.writeUInt32LE(dataLen, 22)  // uncompressed size
    localHeader.writeUInt16LE(nameLen, 26)
    localHeader.writeUInt16LE(0, 28)
    nameBytes.forEach((b, i) => localHeader.writeUInt8(b, 30 + i))

    // Central directory
    const centralDir = Buffer.alloc(46 + nameLen)
    centralDir.writeUInt32LE(0x02014b50, 0) // signature
    centralDir.writeUInt16LE(20, 4)  // version made by
    centralDir.writeUInt16LE(20, 6)  // version needed
    centralDir.writeUInt16LE(0, 8)   // flags
    centralDir.writeUInt16LE(0, 10)  // no compression
    centralDir.writeUInt16LE(0, 12)  // mod time
    centralDir.writeUInt16LE(0, 14)  // mod date
    centralDir.writeUInt32LE(0, 16)  // CRC-32
    centralDir.writeUInt32LE(dataLen, 20)  // compressed size
    centralDir.writeUInt32LE(dataLen, 24)  // uncompressed size
    centralDir.writeUInt16LE(nameLen, 28)
    centralDir.writeUInt16LE(0, 30)
    centralDir.writeUInt16LE(0, 32)
    centralDir.writeUInt16LE(0, 34)
    centralDir.writeUInt16LE(0, 36)
    centralDir.writeUInt32LE(0, 38)  // external attrs
    centralDir.writeUInt32LE(0, 42)  // offset of local header
    nameBytes.forEach((b, i) => centralDir.writeUInt8(b, 46 + i))

    // End of central directory
    const endOfCentralDir = Buffer.alloc(22)
    const centralDirOffset = localHeader.length + dataLen
    endOfCentralDir.writeUInt32LE(0x06054b50, 0) // signature
    endOfCentralDir.writeUInt16LE(0, 4)
    endOfCentralDir.writeUInt16LE(0, 6)
    endOfCentralDir.writeUInt16LE(1, 8)  // 1 entry on this disk
    endOfCentralDir.writeUInt16LE(1, 10) // 1 entry total
    endOfCentralDir.writeUInt32LE(centralDir.length, 12)
    endOfCentralDir.writeUInt32LE(centralDirOffset, 16)
    endOfCentralDir.writeUInt16LE(0, 20)

    const zipBuffer = Buffer.concat([localHeader, content, centralDir, endOfCentralDir])
    return { zipBuffer }
}
