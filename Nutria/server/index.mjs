import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { unlockIssuer } from "./issuer.mjs";
import { openDatabase, ActivationService } from "./service.mjs";
import { createWebhookServer } from "./http.mjs";
const env = process.env;
const requireEnv = (name) => {
  if (!env[name]) throw Error(`Missing configuration: ${name}`);
  return env[name];
};
// Intentionally test-only. Going live requires a separate reviewed release.
if (env.STRIPE_MODE !== "test")
  throw Error("This server release only supports STRIPE_MODE=test");
if (!requireEnv("STRIPE_API_KEY").startsWith("rk_test_"))
  throw Error("Use a restricted test key in the hosting secrets vault");
const stripe = new Stripe(env.STRIPE_API_KEY, {
  apiVersion: "2026-10-28.endive",
  maxNetworkRetries: 2,
});
const account = await stripe.accounts.retrieve();
if (account.id !== requireEnv("STRIPE_ACCOUNT_ID"))
  throw Error("Unexpected Stripe account");
const price = await stripe.prices.retrieve(requireEnv("STRIPE_PRICE_ID"));
if (
  price.livemode !== false ||
  !price.active ||
  price.currency !== "brl" ||
  price.unit_amount !== 850 ||
  price.recurring?.interval !== "month" ||
  price.recurring?.interval_count !== 1
)
  throw Error("Unexpected Nutria test price");
const publicConfig = JSON.parse(
  readFileSync(new URL("../src/auth/activation-config.json", import.meta.url)),
);
const issuer = JSON.parse(
  readFileSync(requireEnv("NUTRIA_ISSUER_FILE"), "utf8"),
);
const issue = unlockIssuer(
  issuer,
  requireEnv("NUTRIA_ISSUER_PASSWORD"),
  publicConfig.publicKey,
);
const directory = resolve(env.DATA_DIR || "./data");
mkdirSync(directory, { recursive: true, mode: 0o700 });
const mode = requireEnv("DELIVERY_MODE");
if (!["preview", "smtp"].includes(mode)) throw Error("Unknown delivery mode");
let transport;
if (mode === "smtp") {
  transport = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port: Number(env.SMTP_PORT || 465),
    secure: env.SMTP_PORT !== "587",
    requireTLS: true,
    auth: { user: requireEnv("SMTP_USER"), pass: requireEnv("SMTP_PASSWORD") },
    connectionTimeout: 15000,
    socketTimeout: 30000,
  });
}
const preview = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: "unix",
});
async function send(row) {
  const recipient = requireEnv("TEST_RECIPIENT").trim().toLowerCase();
  // Test mode must not send mail to arbitrary checkout users.
  if (row.email !== recipient)
    throw Error("Recipient not allowed in test mode");
  const message = {
    from:
      mode === "smtp"
        ? requireEnv("MAIL_FROM")
        : "Nutria Teste <teste@nutria.invalid>",
    to: row.email,
    messageId: `<nutria-${row.invoice_id}@activation.nutria.invalid>`,
    subject: "Nutria — seu código de ativação (TESTE)",
    text: `Este é um teste: nenhuma cobrança real foi feita.\n\nE-mail: ${row.email}\nVálido até: ${new Date(row.expires_at).toISOString()}\n\nCódigo:\n${row.code}\n\nAbra o Nutria e cole este e-mail e o código completo na tela de ativação. Use o mesmo e-mail do teste gratuito para manter seus registros.\n`,
  };
  if (mode === "smtp") {
    const result = await transport.sendMail(message);
    if (!result.accepted?.length || result.rejected?.length)
      throw Error("Email rejected");
  } else {
    const result = await preview.sendMail(message);
    const name = row.invoice_id.replace(/[^A-Za-z0-9_-]/g, "_");
    writeFileSync(join(directory, `${name}.eml`), result.message, {
      mode: 0o600,
    });
  }
}
const db = openDatabase(join(directory, "activation.sqlite"));
const service = new ActivationService({
  db,
  stripe,
  priceId: env.STRIPE_PRICE_ID,
  issue,
  send,
});
let delivering = false;
async function drain() {
  if (delivering) return;
  delivering = true;
  try {
    await service.deliver();
  } catch {
    console.error(
      "Delivery pending. Check provider settings and retry; no secrets or activation codes are logged.",
    );
  } finally {
    delivering = false;
  }
}
const server = createWebhookServer({
  stripe,
  secret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  service,
});
server.listen(Number(env.PORT || 3000), "0.0.0.0", () => {
  console.log("Nutria test webhook ready");
  void drain();
});
const timer = setInterval(() => void drain(), 15000);
function stop() {
  clearInterval(timer);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
