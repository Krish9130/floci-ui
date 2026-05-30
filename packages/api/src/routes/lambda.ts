import {Hono} from 'hono'
import {
    ListFunctionsCommand,
    GetFunctionCommand,
    InvokeCommand,
    DeleteFunctionCommand,
    CreateFunctionCommand,
} from '@aws-sdk/client-lambda'
import {lambda} from '../aws'

const app = new Hono()

app.get('/functions', async (c) => {
    const res = await lambda.send(new ListFunctionsCommand({}))
    return c.json((res.Functions ?? []).map(fn => ({
        name: fn.FunctionName ?? '',
        arn: fn.FunctionArn,
        runtime: fn.Runtime,
        handler: fn.Handler,
        state: fn.State,
        lastModified: fn.LastModified,
        memorySize: fn.MemorySize,
        timeout: fn.Timeout,
        codeSize: fn.CodeSize,
        packageType: fn.PackageType,
        description: fn.Description,
    })))
})
app.get('/functions/:name', async (c) => {
    const name = c.req.param('name')
    const res = await lambda.send(new GetFunctionCommand({ FunctionName: name }))
    const conf = res.Configuration
    return c.json({
        name: conf?.FunctionName ?? name,
        functionArn: conf?.FunctionArn,
        runtime: conf?.Runtime,
        handler: conf?.Handler,
        state: conf?.State,
        stateReason: conf?.StateReason,
        lastModified: conf?.LastModified,
        memorySize: conf?.MemorySize,
        timeout: conf?.Timeout,
        codeSize: conf?.CodeSize,
        packageType: conf?.PackageType,
        description: conf?.Description,
        architectures: conf?.Architectures,
        role: conf?.Role,
        environment: conf?.Environment?.Variables,
    })
})

app.post('/functions/:name/invoke', async (c) => {
    const name = c.req.param('name')
    const body = await c.req.json()
    const payload = body.payload ?? '{}'
    
    const started = performance.now()
    const res = await lambda.send(new InvokeCommand({
        FunctionName: name,
        Payload: new TextEncoder().encode(payload),
        LogType: 'Tail',
    }))
    const duration = Math.round(performance.now() - started)

    const responsePayload = res.Payload ? new TextDecoder().decode(res.Payload) : ''
    const logResult = res.LogResult ? Buffer.from(res.LogResult, 'base64').toString('utf-8') : undefined

    return c.json({
        statusCode: res.StatusCode,
        payload: responsePayload,
        functionError: res.FunctionError,
        logResult,
        executionDuration: duration,
    })
})

app.delete('/functions/:name', async (c) => {
    const name = c.req.param('name')
    await lambda.send(new DeleteFunctionCommand({ FunctionName: name }))
    return c.json({ success: true })
})

app.post('/functions', async (c) => {
    const body = await c.req.json()
    const functionName = body.name
    const runtime = body.runtime || 'nodejs20.x'
    
    // Create a minimal inline zip for local Floci
    const code = Buffer.from('exports.handler = async (event) => ({ statusCode: 200, body: "Hello from Floci Lambda!" });')
    
    // Manual ZIP creation
    const encoder = new TextEncoder()
    const nameBytes = encoder.encode('index.js')
    const nameLen = nameBytes.length
    const dataLen = code.length

    const localHeader = Buffer.alloc(30 + nameLen)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(0, 14)
    localHeader.writeUInt32LE(dataLen, 18)
    localHeader.writeUInt32LE(dataLen, 22)
    localHeader.writeUInt16LE(nameLen, 26)
    localHeader.writeUInt16LE(0, 28)
    nameBytes.forEach((b, i) => localHeader.writeUInt8(b, 30 + i))

    const centralDir = Buffer.alloc(46 + nameLen)
    centralDir.writeUInt32LE(0x02014b50, 0)
    centralDir.writeUInt16LE(20, 4)
    centralDir.writeUInt16LE(20, 6)
    centralDir.writeUInt16LE(0, 8)
    centralDir.writeUInt16LE(0, 10)
    centralDir.writeUInt16LE(0, 12)
    centralDir.writeUInt16LE(0, 14)
    centralDir.writeUInt32LE(0, 16)
    centralDir.writeUInt32LE(dataLen, 20)
    centralDir.writeUInt32LE(dataLen, 24)
    centralDir.writeUInt16LE(nameLen, 28)
    centralDir.writeUInt16LE(0, 30)
    centralDir.writeUInt16LE(0, 32)
    centralDir.writeUInt16LE(0, 34)
    centralDir.writeUInt16LE(0, 36)
    centralDir.writeUInt32LE(0, 38)
    centralDir.writeUInt32LE(0, 42)
    nameBytes.forEach((b, i) => centralDir.writeUInt8(b, 46 + i))

    const endOfCentralDir = Buffer.alloc(22)
    const centralDirOffset = localHeader.length + dataLen
    endOfCentralDir.writeUInt32LE(0x06054b50, 0)
    endOfCentralDir.writeUInt16LE(0, 4)
    endOfCentralDir.writeUInt16LE(0, 6)
    endOfCentralDir.writeUInt16LE(1, 8)
    endOfCentralDir.writeUInt16LE(1, 10)
    endOfCentralDir.writeUInt32LE(centralDir.length, 12)
    endOfCentralDir.writeUInt32LE(centralDirOffset, 16)
    endOfCentralDir.writeUInt16LE(0, 20)

    const zipBuffer = Buffer.concat([localHeader, code, centralDir, endOfCentralDir])

    const res = await lambda.send(new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: runtime,
        Handler: 'index.handler',
        Role: 'arn:aws:iam::000000000000:role/lambda-role',
        Code: { ZipFile: zipBuffer },
    }))

    return c.json({
        name: res.FunctionName,
        arn: res.FunctionArn,
    })
})

export default app
