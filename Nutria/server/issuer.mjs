import {
  createPrivateKey,
  createPublicKey,
  createHash,
  sign,
  randomBytes,
  pbkdf2Sync,
  createDecipheriv,
} from "node:crypto";
export function normalizeEmail(value) {
  if (typeof value !== "string") throw new Error("Informe um e-mail válido.");
  const email = value.trim().toLowerCase();
  const parts = email.split("@");
  if (
    email.length > 254 ||
    parts.length !== 2 ||
    parts[0].length > 64 ||
    !parts[0] ||
    parts[0].startsWith(".") ||
    parts[0].endsWith(".") ||
    parts[0].includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email,
    )
  )
    throw new Error("Informe um e-mail válido.");
  return email;
}
export function unlockIssuer(bundle, password, expectedPublicKey) {
  if (
    bundle.format !== "nutria-issuer-v1" ||
    bundle.algorithm !== "Ed25519" ||
    bundle.kdf !== "PBKDF2-SHA256" ||
    !Number.isInteger(bundle.iterations) ||
    bundle.iterations < 100000 ||
    bundle.iterations > 1000000
  )
    throw Error("Invalid issuer file");
  const publicBytes = Buffer.from(bundle.publicKey, "base64url");
  const kid = createHash("sha256")
    .update(publicBytes)
    .digest("hex")
    .slice(0, 16);
  if (
    publicBytes.length !== 32 ||
    bundle.keyId !== kid ||
    bundle.publicKey !== expectedPublicKey
  )
    throw Error("Issuer does not match APK public key");
  const key = pbkdf2Sync(
    password,
    Buffer.from(bundle.salt, "base64url"),
    bundle.iterations,
    32,
    "sha256",
  );
  let plain;
  try {
    const encrypted = Buffer.from(bundle.encryptedPrivateKey, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(bundle.iv, "base64url"),
    );
    decipher.setAuthTag(encrypted.subarray(-16));
    plain = Buffer.concat([
      decipher.update(encrypted.subarray(0, -16)),
      decipher.final(),
    ]);
    const privateKey = createPrivateKey({
      key: plain,
      format: "der",
      type: "pkcs8",
    });
    const actual = createPublicKey(privateKey).export({ format: "jwk" });
    if (actual.crv !== "Ed25519" || actual.x !== expectedPublicKey)
      throw Error("Private key mismatch");
    return (email, expiresAt, now = Date.now()) => {
      if (!Number.isSafeInteger(expiresAt) || expiresAt <= now)
        throw Error("Invalid paid period");
      const payload = JSON.stringify({
        v: 1,
        app: "app.nutria.mobile",
        kid,
        email: normalizeEmail(email),
        iat: now,
        exp: expiresAt,
        id: randomBytes(16).toString("hex"),
      });
      const signature = sign(
        null,
        Buffer.from("Nutria activation v1\n" + payload),
        privateKey,
      );
      return `NTR1.${Buffer.from(payload).toString("base64url")}.${signature.toString("base64url")}`;
    };
  } finally {
    key.fill(0);
    plain?.fill(0);
  }
}
