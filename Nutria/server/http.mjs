import { createServer } from "node:http";
export function createWebhookServer({ stripe, secret, service }) {
  // Single process / single persistent SQLite volume. Serialize webhook processing.
  let queue = Promise.resolve();
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    if (req.method !== "POST" || req.url !== "/stripe/webhook") {
      res.writeHead(404);
      res.end();
      return;
    }
    const chunks = [];
    let size = 0,
      event;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(chunk);
      }
      event = stripe.webhooks.constructEvent(
        Buffer.concat(chunks),
        req.headers["stripe-signature"],
        secret,
      );
    } catch {
      res.writeHead(400);
      res.end("Invalid webhook");
      return;
    }
    const task = queue.then(() => service.handle(event));
    queue = task.catch(() => {});
    try {
      await task;
      res.writeHead(200);
      res.end("ok");
    } catch {
      res.writeHead(503);
      res.end("Retry later");
    }
  });
}
