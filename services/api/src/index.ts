import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3002);
const host = process.env.HOST ?? "0.0.0.0";

const app = await createApp();

try {
  await app.listen({ port, host });
  console.log(`RedeemLoop API listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
