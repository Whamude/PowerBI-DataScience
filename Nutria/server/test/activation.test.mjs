import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto, createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Stripe from "stripe";
import { unlockIssuer } from "../issuer.mjs";
import { openDatabase, ActivationService } from "../service.mjs";
import { createWebhookServer } from "../http.mjs";
import { verifyActivation } from "../../src/auth/license.mjs";
const now = Date.now(),
  expiry = now + 30 * 86400000;
const priceId = "price_test_nutria";
const invoice = (id = "in_fixture", overrides = {}) => ({
  id,
  livemode: false,
  status: "paid",
  currency: "brl",
  amount_paid: 850,
  billing_reason: "subscription_cycle",
  customer: "cus_fixture",
  customer_email: "pessoa@example.com",
  parent: { subscription_details: { subscription: "sub_fixture" } },
  ...overrides,
});
const line = (overrides = {}) => ({
  pricing: { price_details: { price: priceId } },
  parent: {
    type: "subscription_item_details",
    subscription_item_details: {
      subscription: "sub_fixture",
      proration: false,
    },
  },
  amount: 850,
  quantity: 1,
  period: { end: expiry / 1000 },
  ...overrides,
});
function fixture({
  db = openDatabase(":memory:"),
  inv = invoice(),
  lines = [line()],
  send = async () => {},
  subStatus = "active",
  issue = () => "test-code",
} = {}) {
  const stripe = {
    invoices: {
      retrieve: async () => inv,
      listLineItems: async function* () {
        yield* lines;
      },
    },
    subscriptions: {
      retrieve: async () => ({
        livemode: false,
        status: subStatus,
        customer: "cus_fixture",
      }),
    },
    checkout: {
      sessions: {
        retrieve: async () => ({
          livemode: false,
          mode: "subscription",
          payment_status: "paid",
          invoice: inv.id,
        }),
      },
    },
  };
  const service = new ActivationService({
    db,
    stripe,
    priceId,
    issue,
    send,
    now: () => now,
  });
  return { db, stripe, service };
}
const event = (
  id = "evt_fixture",
  type = "invoice.paid",
  object = { id: "in_fixture" },
) => ({
  id,
  livemode: false,
  type,
  created: Math.floor(now / 1000),
  data: { object },
});
async function encryptedIssuer() {
  const pair = await webcrypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);
  const publicKey = Buffer.from(
    await webcrypto.subtle.exportKey("raw", pair.publicKey),
  ).toString("base64url");
  const salt = new Uint8Array(16).fill(1),
    iv = new Uint8Array(12).fill(2),
    password = "test-fixture-password";
  const material = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await webcrypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const cipher = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    await webcrypto.subtle.exportKey("pkcs8", pair.privateKey),
  );
  return {
    password,
    publicKey,
    bundle: {
      format: "nutria-issuer-v1",
      algorithm: "Ed25519",
      kdf: "PBKDF2-SHA256",
      iterations: 100000,
      publicKey,
      keyId: createHash("sha256")
        .update(Buffer.from(publicKey, "base64url"))
        .digest("hex")
        .slice(0, 16),
      salt: Buffer.from(salt).toString("base64url"),
      iv: Buffer.from(iv).toString("base64url"),
      encryptedPrivateKey: Buffer.from(cipher).toString("base64url"),
    },
  };
}
test("protected offline issuer unlocks, matches APK key and produces compatible expiring license", async () => {
  const { bundle, password, publicKey } = await encryptedIssuer();
  const issue = unlockIssuer(bundle, password, publicKey);
  const sent = [];
  const { service } = fixture({ issue, send: async (row) => sent.push(row) });
  await service.handle(event());
  await service.deliver();
  const activation = verifyActivation({
    email: "pessoa@example.com",
    code: sent[0].code,
    publicKey,
    now,
  });
  assert.equal(activation.expiresAt, expiry);
  assert.throws(() =>
    verifyActivation({
      email: "outra@example.com",
      code: sent[0].code,
      publicKey,
      now,
    }),
  );
  assert.throws(() =>
    verifyActivation({
      email: "pessoa@example.com",
      code: sent[0].code,
      publicKey,
      now: expiry,
    }),
  );
  assert.throws(() => unlockIssuer(bundle, "wrong password", publicKey));
  assert.throws(() => unlockIssuer(bundle, password, "different-key"));
});
test("duplicate events and Checkout notifications issue and deliver only once per invoice", async () => {
  let issued = 0,
    sent = 0;
  const { service, db } = fixture({
    issue: () => {
      issued++;
      return "fixture";
    },
    send: async () => {
      sent++;
    },
  });
  await service.handle(event());
  await service.handle(event());
  await service.handle(event("evt_duplicate_invoice"));
  await service.handle(
    event("evt_checkout", "checkout.session.completed", { id: "cs_fixture" }),
  );
  await service.deliver();
  await service.deliver();
  assert.equal(issued, 1);
  assert.equal(sent, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM deliveries").get().n, 1);
});
test("unpaid, unrelated, expired, proration, wrong currency, canceled and live invoices cannot issue", async () => {
  const cases = [
    { inv: invoice("in_fixture", { status: "open" }) },
    { inv: invoice("in_fixture", { amount_paid: 0 }) },
    { inv: invoice("in_fixture", { currency: "usd" }) },
    { inv: invoice("in_fixture", { livemode: true }) },
    { inv: invoice("in_fixture", { billing_reason: "manual" }) },
    { subStatus: "canceled" },
    { lines: [line({ pricing: { price_details: { price: "unrelated" } } })] },
    { lines: [line({ period: { end: (now - 1000) / 1000 } })] },
    {
      lines: [
        line({
          parent: {
            type: "subscription_item_details",
            subscription_item_details: {
              subscription: "sub_fixture",
              proration: true,
            },
          },
        }),
      ],
    },
  ];
  for (const options of cases) {
    const { service, db } = fixture(options);
    await service.handle(event());
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM deliveries").get().n, 0);
  }
  await assert.rejects(
    fixture().service.handle({ ...event(), livemode: true }),
  );
});
test("mail failures retry same code after restart, without generating another license", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nutria-mail-"));
  try {
    let db = openDatabase(join(dir, "db.sqlite"));
    const first = fixture({
      db,
      send: async () => {
        throw Error("provider unavailable");
      },
    });
    await first.service.handle(event());
    await assert.rejects(first.service.deliver());
    db.close();
    db = openDatabase(join(dir, "db.sqlite"));
    const sent = [];
    const second = fixture({
      db,
      issue: () => {
        throw Error("must not reissue");
      },
      send: async (row) => sent.push(row.code),
    });
    await second.service.handle(event());
    await second.service.deliver();
    assert.deepEqual(sent, ["test-code"]);
    assert.equal(
      db.prepare("SELECT attempts FROM deliveries").get().attempts,
      2,
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("failures and subscription lifecycle do not grant access; risk events enter review queue", async () => {
  const { service, db } = fixture();
  for (const [i, type] of [
    "invoice.payment_failed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "charge.refunded",
    "charge.dispute.created",
    "radar.early_fraud_warning.created",
  ].entries())
    await service.handle(event("evt_" + i, type));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM deliveries").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM reviews").get().n, 3);
});
test("HTTP rejects invalid signature and processes authentic raw-body event", async () => {
  const stripe = new Stripe("fixture-api-key");
  const secret = "fixture-webhook-secret";
  let received = 0;
  const server = createWebhookServer({
    stripe,
    secret,
    service: {
      handle: async () => {
        received++;
      },
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/stripe/webhook`;
    const body = JSON.stringify(event());
    assert.equal((await fetch(url, { method: "POST", body })).status, 400);
    assert.equal(received, 0);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret,
    });
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          body,
          headers: { "stripe-signature": header },
        })
      ).status,
      200,
    );
    assert.equal(received, 1);
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          body: body + " ",
          headers: { "stripe-signature": header },
        })
      ).status,
      400,
    );
    assert.equal(received, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
