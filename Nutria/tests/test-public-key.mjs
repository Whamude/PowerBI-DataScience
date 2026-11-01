// Somente para executar o navegador de testes. Não configurar no APK distribuído.
import {ed25519} from '@noble/curves/ed25519.js';
import {toBase64Url} from '../src/auth/license.mjs';
console.log(toBase64Url(ed25519.getPublicKey(Uint8Array.from({length:32},(_,i)=>i+1))));
