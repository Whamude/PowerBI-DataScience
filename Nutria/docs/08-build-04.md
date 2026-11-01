# Nutria 0.4 — ativação por e-mail

- Versão: 0.4.0; Android versionCode: 4.
- Identificador Android: `app.nutria.mobile`.
- Chave pública de ativação: `cfae2c592dc713e9`.
- Perfil EAS: `preview`, APK para distribuição interna.
- Build: `bffa060e-89fe-4cd1-a762-f92f2b8e8946`.
- Acompanhamento: https://expo.dev/accounts/whamudes-team/projects/Nutria/builds/bffa060e-89fe-4cd1-a762-f92f2b8e8946
- Estado EAS: **FINISHED**.
- Conclusão UTC: `2026-11-01T21:11:11.992Z`.
- APK: https://expo.dev/artifacts/eas/iJMrdMlhw-WaTzUH7CYBtm8GNUAUtvrmE1FUonW_IBU.apk
- Expiração informada pelo EAS: `2026-11-15T20:58:10.496Z`. Baixe e guarde uma cópia do APK antes dessa data.

A versão inclui ativação offline individual por e-mail, proteção das rotas privadas, registros separados por e-mail e migração consentida dos dados anteriores. A chave privada de emissão permanece com o proprietário; somente a chave pública está no aplicativo.

`expo-font` foi declarado diretamente com a versão compatível com o SDK 58 e seu config plugin, corrigindo o alerta de dependência nativa exigida por `@expo/vector-icons`. O build utiliza as credenciais Android gerenciadas existentes, com `--freeze-credentials`, para preservar a assinatura utilizada na versão anterior.

## Validação

- Lint e TypeScript passaram.
- Os 19 testes de domínio, integridade e ativação passaram.
- Os testes de navegador `browser-activation.cjs` e `browser-flows.cjs` passaram após a correção da dependência de fontes. A chave descartável foi aplicada somente ao processo local de testes.
- A compilação nativa Android concluiu com sucesso no EAS.
- No servidor EAS, Expo Doctor passou nas 20 verificações. Localmente, duas verificações online ficaram limitadas pelo acesso à rede.
- Não houve instalação ou teste físico em Android/iPhone, nem publicação em lojas.

## Instalação e ativação

Instale o APK como atualização da versão 0.3, sem desinstalar o app para preservar os registros locais. A versão 0.4 exige o e-mail e um código emitido pelo gerador do proprietário usando a chave correspondente a `cfae2c592dc713e9`. A associação dos dados anteriores exige confirmação no aplicativo.

O domínio `wf-artifacts.eascdn.net`, usado pelo Expo no download dos APKs, ainda está bloqueado neste ambiente. A inclusão foi salva no rascunho de rede, sem publicação. Isso impede baixar e inspecionar localmente o APK enquanto a liberação não for aplicada.
