# APK Android de teste — build concluído

O Expo/EAS concluiu o build Android com status FINISHED em 2026-10-31T17:53:04.078Z. Perfil preview: distribuição interna, buildType apk, assinatura Android gerenciada pelo Expo. Não exige servidor Metro.

- Projeto Expo: @whamudes-team/Nutria
- ID do projeto: 3fcedfe1-f754-4191-be79-eb7350492f26
- ID do build: 8fb12d81-4ef8-4031-9d5c-1632ff855857
- Página de instalação: https://expo.dev/accounts/whamudes-team/projects/Nutria/builds/8fb12d81-4ef8-4031-9d5c-1632ff855857
- APK: https://expo.dev/artifacts/eas/tA15rf8Xh2Jlkw0m4fdi9aa7RufoYP1e5VYfBNwA-Jk.apk

Validações: lint, TypeScript e três testes de domínio passaram; compilação Android remota concluída. O download do artefato pelo executor retornou HTTP 403; use o link Expo no navegador do celular. Não houve instalação ou teste físico em aparelho nem verificação local independente da assinatura.

O app inclui diário manual, macros, água, receitas demonstrativas e armazenamento local. IA, conta, sincronização e saúde ainda não estão implementados.

## Próximos builds

```sh
cd /workspace/Nutria
npm run lint
npm run typecheck
npm test
npx eas-cli@latest build --platform android --profile preview
```

Preservar projectId e assinatura gerenciada no Expo para atualizar a mesma instalação. Não guardar token em arquivos do projeto.
