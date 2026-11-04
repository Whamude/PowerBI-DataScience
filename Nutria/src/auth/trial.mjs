import { normalizeEmail, accountId } from "./license.mjs";
export const TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000;
const CLOCK_TOLERANCE = 5 * 60 * 1000;
export function createTrial(email, now = Date.now()) {
  return {
    version: 1,
    email: normalizeEmail(email),
    startedAt: now,
    lastSeenAt: now,
    ended: false,
    signedOut: false,
  };
}
export function checkTrial(saved, now = Date.now()) {
  if (
    !saved ||
    saved.version !== 1 ||
    normalizeEmail(saved.email) !== saved.email ||
    !Number.isSafeInteger(saved.startedAt) ||
    saved.startedAt < 0 ||
    !Number.isSafeInteger(saved.lastSeenAt) ||
    saved.lastSeenAt < saved.startedAt ||
    typeof saved.ended !== "boolean" ||
    typeof saved.signedOut !== "boolean"
  )
    throw new Error(
      "Não foi possível ler o período experimental. Use seu código de ativação.",
    );
  const expiresAt = saved.startedAt + TRIAL_DURATION;
  const ended =
    saved.ended || now >= expiresAt || now < saved.lastSeenAt - CLOCK_TOLERANCE;
  const record = {
    ...saved,
    lastSeenAt: Math.max(now, saved.lastSeenAt),
    ended,
  };
  return {
    record,
    activation: ended
      ? null
      : {
          email: saved.email,
          accountId: accountId(saved.email),
          licenseId: "trial",
          issuedAt: saved.startedAt,
          expiresAt,
          trial: true,
        },
  };
}
export function resumeTrial(saved, email, now = Date.now()) {
  const result = checkTrial(saved, now);
  if (normalizeEmail(email) !== saved.email)
    throw new Error(
      "O teste deste aparelho já está associado a outro e-mail. Use um código de ativação para outra conta.",
    );
  if (!result.activation)
    throw new Error(
      "Seu teste de 7 dias terminou. Ative com seu e-mail e código para continuar; seus registros estão preservados.",
    );
  return { ...result, record: { ...result.record, signedOut: false } };
}
