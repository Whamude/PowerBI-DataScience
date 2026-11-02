import test from "node:test";
import assert from "node:assert/strict";
import {
  createTrial,
  checkTrial,
  resumeTrial,
  TRIAL_DURATION,
} from "../src/auth/trial.mjs";
import { accountId } from "../src/auth/license.mjs";
const now = Date.UTC(2026, 10, 2, 12);
test("teste dura exatamente 96 horas e mantém o namespace da ativação por e-mail", () => {
  const saved = createTrial(" PESSOA@example.com ", now);
  const { activation } = checkTrial(saved, now);
  assert.equal(activation.accountId, accountId("pessoa@example.com"));
  assert.equal(activation.expiresAt, now + 96 * 3600000);
  assert.ok(checkTrial(saved, now + TRIAL_DURATION - 1).activation);
  assert.equal(checkTrial(saved, now + TRIAL_DURATION).activation, null);
});
test("fechar, reabrir, sair e retomar preservam início; trocar e-mail não renova teste", () => {
  const saved = createTrial("pessoa@example.com", now);
  const restarted = checkTrial(
    JSON.parse(JSON.stringify(saved)),
    now + 3600000,
  );
  const resumed = resumeTrial(
    { ...restarted.record, signedOut: true },
    "PESSOA@example.com",
    now + 7200000,
  );
  assert.equal(resumed.record.startedAt, now);
  assert.equal(resumed.record.signedOut, false);
  assert.equal(resumed.activation.expiresAt, now + TRIAL_DURATION);
  assert.throws(
    () => resumeTrial(saved, "outra@example.com", now),
    /outro e-mail/,
  );
});
test("expiração permanece bloqueada após voltar relógio e licença encerra elegibilidade", () => {
  const saved = createTrial("pessoa@example.com", now);
  const expired = checkTrial(saved, now + TRIAL_DURATION);
  assert.equal(checkTrial(expired.record, now).activation, null);
  assert.throws(
    () => resumeTrial(expired.record, saved.email, now),
    /terminou/,
  );
  assert.equal(checkTrial({ ...saved, ended: true }, now).activation, null);
});
test("relógio recuado significativamente bloqueia; pequenas correções não estendem prazo", () => {
  const saved = checkTrial(
    createTrial("pessoa@example.com", now),
    now + 3600000,
  ).record;
  const small = checkTrial(saved, saved.lastSeenAt - 60000);
  assert.ok(small.activation);
  assert.equal(small.record.lastSeenAt, saved.lastSeenAt);
  assert.equal(checkTrial(saved, now).activation, null);
});
test("metadados inválidos falham sem criar outro período", () => {
  const saved = createTrial("pessoa@example.com", now);
  for (const bad of [
    null,
    {},
    { ...saved, email: "ruim" },
    { ...saved, startedAt: "ontem" },
    { ...saved, lastSeenAt: now - 1 },
    { ...saved, ended: undefined },
  ])
    assert.throws(() => checkTrial(bad, now));
  assert.throws(() => createTrial("ruim", now));
});
