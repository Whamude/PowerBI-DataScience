import { readFileSync, writeFileSync } from "node:fs";
import { keyId, fromBase64Url } from "../src/auth/license.mjs";
const path = process.argv[2];
if (!path)
  throw new Error(
    "Uso: node tools/configurar-chave-publica.mjs arquivo-publico.json",
  );
const config = JSON.parse(readFileSync(path, "utf8"));
if (
  config.encryptedPrivateKey ||
  config.privateKey ||
  config.format === "nutria-issuer-v1"
)
  throw new Error(
    "Este arquivo contém uma chave privada. Use somente o arquivo da chave pública.",
  );
if (
  Object.keys(config).some((k) => !["publicKey", "keyId", "issuer"].includes(k))
)
  throw new Error("O arquivo deve conter somente a configuração pública.");
if (
  fromBase64Url(config.publicKey).length !== 32 ||
  config.keyId !== keyId(config.publicKey)
)
  throw new Error("Configuração pública inválida.");
writeFileSync(
  new URL("../src/auth/activation-config.json", import.meta.url),
  JSON.stringify(
    { publicKey: config.publicKey, keyId: config.keyId, issuer: "Nutria" },
    null,
    2,
  ) + "\n",
);
console.log("Chave pública configurada. Identificador:", config.keyId);
console.log(
  "Compile um novo APK para aplicar esta chave. Não foi criada nem copiada nenhuma chave privada.",
);
