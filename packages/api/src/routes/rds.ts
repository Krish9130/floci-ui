import { Hono } from "hono";
import { rdsService } from "../services/rds";

const app = new Hono();

app.get("/instances", async (c) => {
  return c.json(await rdsService.listInstances());
});

app.get("/instances/:identifier", async (c) => {
  return c.json(await rdsService.describeInstance(c.req.param("identifier")));
});

app.get("/snapshots", async (c) => {
  return c.json(await rdsService.listSnapshots(c.req.query("instanceIdentifier")));
});

app.post("/snapshots", async (c) => {
  const body = await c.req.json<{
    instanceIdentifier: string;
    snapshotIdentifier?: string;
  }>();
  if (!body.instanceIdentifier) {
    return c.json({ error: "instanceIdentifier is required" }, 400);
  }
  const snapshotIdentifier =
    body.snapshotIdentifier?.trim() ||
    `${body.instanceIdentifier}-snapshot-${Date.now()}`;
  return c.json(
    await rdsService.createSnapshot(body.instanceIdentifier, snapshotIdentifier),
    201,
  );
});

app.post("/instances", async (c) => {
  const body = await c.req.json<{
    identifier: string;
    engine: string;
    instanceClass: string;
    allocatedStorage: number;
    masterUsername: string;
    masterUserPassword?: string;
  }>();
  if (!body.identifier || !body.engine || !body.instanceClass || !body.allocatedStorage || !body.masterUsername) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  return c.json(await rdsService.createInstance(body), 201);
});

app.post("/instances/:identifier/start", async (c) => {
  return c.json(await rdsService.startInstance(c.req.param("identifier")));
});

app.post("/instances/:identifier/stop", async (c) => {
  return c.json(await rdsService.stopInstance(c.req.param("identifier")));
});

app.post("/instances/:identifier/reboot", async (c) => {
  return c.json(await rdsService.rebootInstance(c.req.param("identifier")));
});

app.delete("/instances/:identifier", async (c) => {
  return c.json(await rdsService.deleteInstance(c.req.param("identifier")));
});

export default app;
