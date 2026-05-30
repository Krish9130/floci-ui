import { Hono } from "hono";
import { secretsManagerService } from "../services/secretsmanager";

const app = new Hono();

app.get("/secrets", async (c) => {
  return c.json(await secretsManagerService.listSecrets());
});

app.post("/secrets", async (c) => {
  const body = await c.req.json();
  const arn = await secretsManagerService.createSecret(
    body.name,
    body.value,
    body.description
  );
  return c.json({ arn });
});

app.get("/secrets/:id/value", async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const value = await secretsManagerService.getSecretValue(id);
  return c.json({ value });
});

app.delete("/secrets/:id", async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  await secretsManagerService.deleteSecret(id);
  return c.json({ success: true });
});

export default app;
