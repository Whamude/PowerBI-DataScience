> Atualização 0.5: a chave pública de produção já está configurada. Existe também teste experimental de 96 horas sem código, documentado em [08-teste-experimental.md](08-teste-experimental.md). As referências à chave pendente abaixo descrevem a preparação 0.4.

# Nutria 0.4 — ativação individual por e-mail

O usuário escolheu código de ativação individual baseado no e-mail. Foi preparado um emissor offline e a validação Ed25519 no aplicativo. Não é uma autenticação com senha de servidor.

## Emissão e propriedade da chave

O arquivo tools/gerador-ativacao.html é autossuficiente e bloqueia conexões de rede por CSP. O proprietário gera sua chave privada no próprio navegador e a protege com uma senha sua: PBKDF2-SHA256, 600.000 iterações, sal aleatório e AES-256-GCM com IV aleatório. Nas próximas emissões, importa o arquivo *.issuer.json protegido. A senha não é salva, não é enviada ao app e não é uma senha mestra do APK.

Somente a chave pública deve ser enviada para configuração. tools/configurar-chave-publica.mjs rejeita arquivos de chave privada. O padrão de distribuição em src/auth/activation-config.json permanece sem chave pública até o proprietário fornecê-la; o aplicativo não libera acesso nessa condição. Chaves de teste não são chaves de produção.

## Código e validação

Formato: NTR1.payload.signature. Conteúdo assinado: prefixo de domínio Nutria activation v1, versão, identificador do aplicativo, identificador da chave, e-mail normalizado, emissão, vencimento opcional e identificador aleatório da licença. O APK conhece somente a chave pública. Rejeita assinaturas alteradas, outro emissor/app/e-mail, códigos vencidos e relógio anterior à emissão. Verifica o prazo ao retomar o app e a cada 30 segundos.

O código vincula o TEXTO do e-mail; não comprova que a pessoa controla essa caixa postal. A mesma combinação pode funcionar em vários aparelhos. Sem servidor não há bloqueio remoto imediato, limite de aparelhos nem relógio confiável contra alteração do sistema. O código controla a interface oficial; não é DRM para os assets/código já publicados.

## Aplicativo

- Toda a navegação privada fica sob src/app/(private), protegida por Stack.Protected no layout raiz, inclusive links diretos para receitas e formulários.
- Android/iOS guardam somente e-mail/código de ativação no SecureStore; revalidam a assinatura ao abrir. Nenhuma chave privada no APK.
- Navegador mantém ativação somente em memória; recarregar exige entrar novamente.
- Dados locais ficam separados pelo SHA-256 do e-mail normalizado. Renovar o código do mesmo e-mail preserva o mesmo espaço de dados.
- Sair remove a ativação do aparelho e preserva os registros daquele e-mail.
- O backup anônimo da versão anterior só é associado após confirmação. O original é preservado; depois de associado, outra conta não importa esse mesmo backup.

A proteção não altera os APKs 0.3 ou anteriores que já foram distribuídos. Dados locais não receberam criptografia própria nesta tarefa.

## Configurar a chave real

```sh
node tools/configurar-chave-publica.mjs caminho/nutria-chave-publica-ID.json
npm run typecheck
npm run lint
npm test
npx eas-cli@latest build --platform android --profile preview
```

Nunca configurar o APK com a chave do emissor de testes. O arquivo da chave pública é público e pode ficar no Git; os arquivos *.issuer.json e .activation-private/ são ignorados pelo Git e pelo EAS.

## Testes locais

```sh
npm run typecheck
npm run lint
npm test
# Chave pública descartável de testes, aplicada apenas ao servidor de testes:
EXPO_PUBLIC_ACTIVATION_PUBLIC_KEY="$(node tests/test-public-key.mjs)" EXPO_OFFLINE=1 npx expo start --web --port 8082
# Em outro terminal, com Playwright e Chromium disponíveis:
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-activation.cjs
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-generator.cjs
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-flows.cjs
```

Os scripts browser-migration, browser-storage e browser-imported-recipes da versão 0.3 são históricos e precisam de adaptação à ativação e namespace por e-mail; não constituem validação automática da 0.4. Os novos testes cobrem a migração consentida e o isolamento de contas. Testes físicos em Android/iOS e uso com a chave real ainda estão pendentes.
