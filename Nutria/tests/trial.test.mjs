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
test("teste dura exatamente 168 horas e mantém o namespace da ativação por e-mail", () => {
  const saved = createTrial(" PESSOA@example.com ", now);
  const { activation } = checkTrial(saved, now);
  assert.equal(activation.accountId, accountId("pessoa@example.com"));
  assert.equal(TRIAL_DURATION, 168 * 3600000);
  assert.equal(activation.expiresAt, now + 168 * 3600000);
  assert.ok(checkTrial(saved, now + 168 * 3600000 - 1).activation);
  assert.equal(checkTrial(saved, now + 168 * 3600000).activation, null);
  assert.equal(checkTrial(saved, now + 168 * 3600000 + 1).activation, null);
});
test("registro existente retoma após quatro dias com o início original e sem renovar prazo", () => {
  const day = 24 * 3600000;
  const saved = JSON.parse(JSON.stringify({
    ...createTrial("pessoa@example.com", now),
    lastSeenAt: now + 3 * day,
    signedOut: true,
  }));
  const resumed = resumeTrial(saved, "PESSOA@example.com", now + 5 * day);
  assert.equal(resumed.record.version, 1);
  assert.equal(resumed.record.startedAt, now);
  assert.equal(resumed.activation.issuedAt, now);
  assert.equal(resumed.activation.accountId, accountId(saved.email));
  assert.equal(resumed.activation.expiresAt, now + 7 * day);
  const reopened = checkTrial(JSON.parse(JSON.stringify(resumed.record)), now + 6 * day);
  assert.equal(reopened.activation.expiresAt, now + 7 * day);
  assert.equal(reopened.record.startedAt, now);
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
  const endedPreviously = {
    ...saved,
    lastSeenAt: now + 4 * 86400000,
    ended: true,
  };
  const updated = checkTrial(endedPreviously, now + 5 * 86400000);
  assert.equal(updated.activation, null);
  assert.equal(updated.record.startedAt, saved.startedAt);
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
