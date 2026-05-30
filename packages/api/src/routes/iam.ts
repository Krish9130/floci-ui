import { Hono } from "hono";
import { iamService } from "../services/iam";

const app = new Hono();

app.get("/roles", async (c) => {
  return c.json(await iamService.listRoles());
});

app.get("/users", async (c) => {
  return c.json(await iamService.listUsers());
});

app.get("/policies", async (c) => {
  return c.json(await iamService.listPolicies());
});

export default app;
