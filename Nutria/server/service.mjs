import { DatabaseSync } from "node:sqlite";
import { normalizeEmail } from "./issuer.mjs";
export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS deliveries (
      invoice_id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL,
      email TEXT NOT NULL, expires_at INTEGER NOT NULL, code TEXT NOT NULL,
      sent_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (event_id TEXT PRIMARY KEY, type TEXT NOT NULL, object_id TEXT NOT NULL);`);
  return db;
}
const objectId = (v) => (typeof v === "string" ? v : v?.id);
export class ActivationService {
  constructor({ db, stripe, priceId, issue, send, now = Date.now }) {
    Object.assign(this, { db, stripe, priceId, issue, send, now });
  }
  async paidInvoice(id) {
    const invoice = await this.stripe.invoices.retrieve(id);
    if (
      invoice.livemode !== false ||
      invoice.status !== "paid" ||
      invoice.currency !== "brl" ||
      invoice.amount_paid < 850 ||
      !["subscription_create", "subscription_cycle"].includes(
        invoice.billing_reason,
      )
    )
      return;
    const subscriptionId = objectId(
      invoice.parent?.subscription_details?.subscription,
    );
    if (!subscriptionId) return;
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (
      sub.livemode !== false ||
      !["active", "past_due"].includes(sub.status) ||
      objectId(sub.customer) !== objectId(invoice.customer)
    )
      return;
    const lines = [];
    for await (const line of this.stripe.invoices.listLineItems(id, {
      limit: 100,
    }))
      lines.push(line);
    const paidLines = lines.filter(
      (line) =>
        objectId(line.pricing?.price_details?.price) === this.priceId &&
        line.parent?.type === "subscription_item_details" &&
        objectId(line.parent.subscription_item_details.subscription) ===
          subscriptionId &&
        !line.parent.subscription_item_details.proration &&
        line.amount >= 850 &&
        line.quantity === 1,
    );
    if (paidLines.length !== 1) return;
    const expiresAt = paidLines[0].period?.end * 1000;
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= this.now()) return;
    const email = normalizeEmail(invoice.customer_email);
    const existing = this.db
      .prepare("SELECT invoice_id FROM deliveries WHERE invoice_id=?")
      .get(id);
    if (existing) return;
    const latest = this.db
      .prepare(
        "SELECT MAX(expires_at) AS expiry FROM deliveries WHERE subscription_id=?",
      )
      .get(subscriptionId);
    if (latest.expiry >= expiresAt) return;
    const code = this.issue(email, expiresAt, this.now());
    this.db
      .prepare(
        "INSERT OR IGNORE INTO deliveries(invoice_id, subscription_id, email, expires_at, code) VALUES(?,?,?,?,?)",
      )
      .run(id, subscriptionId, email, expiresAt, code);
  }
  async handle(event) {
    if (event.livemode !== false || event.account)
      throw Error("Unexpected Stripe environment");
    if (this.db.prepare("SELECT id FROM events WHERE id=?").get(event.id))
      return;
    const obj = event.data.object;
    if (event.type === "invoice.paid") await this.paidInvoice(obj.id);
    else if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    ) {
      const session = await this.stripe.checkout.sessions.retrieve(obj.id);
      if (
        session.livemode === false &&
        session.mode === "subscription" &&
        session.payment_status === "paid" &&
        objectId(session.invoice)
      )
        await this.paidInvoice(objectId(session.invoice));
    } else if (
      [
        "charge.refunded",
        "charge.dispute.created",
        "radar.early_fraud_warning.created",
      ].includes(event.type)
    ) {
      // Test-stage review queue. Offline codes cannot be revoked remotely.
      this.db
        .prepare("INSERT OR IGNORE INTO reviews VALUES(?,?,?)")
        .run(event.id, event.type, obj.id);
    }
    // Failed invoices and subscription/customer changes never create or extend a license.
    this.db
      .prepare("INSERT OR IGNORE INTO events VALUES(?,?,?)")
      .run(event.id, event.type, event.created);
  }
  async deliver() {
    let failed = false;
    for (const row of this.db
      .prepare(
        "SELECT * FROM deliveries WHERE sent_at IS NULL AND expires_at > ? ORDER BY expires_at DESC",
      )
      .all(this.now())) {
      const newer = this.db
        .prepare(
          "SELECT MAX(expires_at) AS expiry FROM deliveries WHERE subscription_id=?",
        )
        .get(row.subscription_id);
      if (newer.expiry > row.expires_at) continue;
      this.db
        .prepare("UPDATE deliveries SET attempts=attempts+1 WHERE invoice_id=?")
        .run(row.invoice_id);
      try {
        await this.send(row);
      } catch {
        // Keep the original code pending, but let other recipients progress.
        failed = true;
        continue;
      }
      this.db
        .prepare("UPDATE deliveries SET sent_at=? WHERE invoice_id=?")
        .run(this.now(), row.invoice_id);
    }
    // Do not expose provider errors: they may contain recipients or codes.
    if (failed) throw Error("One or more deliveries remain pending");
  }
}
