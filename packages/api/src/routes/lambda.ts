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
    
    const zipBase64 = "UEsDBBQAAAAIAM4gvly0GVkAWwAAAFwAAAAIABwAaW5kZXguanNVVAkAA7PEGmqzxBpqdXgLAAEE9QEAAAQAAAAABcHBCkBAFAXQva+4rChpsiQ2ShZ+4jFP1JinmSGSf3cO34e44IuVrDbs0ID8Y2ekfLENGZoW6QsfKJy+E80VSqVyTKKfCsnAxggWJzt6I/OGkfZJU5zgy+roB1BLAQIeAxQAAAAIAM4gvly0GVkAWwAAAFwAAAAIABgAAAAAAAEAAACkgQAAAABpbmRleC5qc1VUBQADs8QaanV4CwABBPUBAAAEAAAAAFBLBQYAAAAAAQABAE4AAACdAAAAAAA=";
    const zipBuffer = Buffer.from(zipBase64, 'base64');

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
