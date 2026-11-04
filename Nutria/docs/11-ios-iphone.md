# Nutria no iPhone e iPad

## Escopo e prontidão

A preparação iOS parte da versão bilíngue 0.7.0 do PR #3. Usa o mesmo código de Português/English, 105 receitas, diário, metas, peso, favoritos, coleções/checklists e ativação Ed25519. O identificador permanece `app.nutria.mobile`; o build iOS passa a 8. O Android permanece em versionCode 7, e o APK bilíngue já entregue não foi substituído.

Foram adicionados perfis explícitos de simulador e aparelho em `eas.json`, idiomas declarados no Info.plist, proteção contra sobreposição do teclado nos formulários e uma âncora para o compartilhamento no iPad. A seleção inicial de idioma respeita as áreas seguras e permite rolagem com fontes ampliadas. Não há pasta nativa escrita manualmente: o Expo gera o projeto iOS durante a compilação.

Código preparado, verificações locais aprovadas, build compilado e aplicativo executado em iOS são resultados distintos. Registrar o ID e o resultado da compilação na entrega; uma exportação Metro ou uma compilação bem-sucedida não comprova funcionamento em aparelho.

## Dados, idioma e licenças

- O idioma continua em `nutria.language.v1`, no AsyncStorage, com escolha no primeiro uso, ativação e Perfil. Diálogos nativos seguem o idioma do sistema; o assunto fornecido ao compartilhamento é traduzido pelo Nutria.
- Os dados por e-mail, IDs de receitas/favoritos/checklists, versão 2 do estado e backup legado não foram alterados. Textos livres e registros antigos sem referência de catálogo permanecem literais.
- O teste continua por 168 horas desde o início original. `nutria.trial.v1` e `nutria.activation.v1` continuam no SecureStore nativo, com `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Não adicionar atalhos para reiniciar o teste ou liberar conteúdo protegido.
- No iOS, itens do Keychain podem sobreviver à desinstalação com o mesmo bundle ID. Não apagar esse histórico ao abrir o aplicativo nem usar reinstalação como procedimento para reiniciar o teste. Reinstalar pode perder o diário no AsyncStorage, mesmo quando a licença ou o histórico do teste persistem no Keychain.
- A mesma chave pública verifica as licenças existentes. Nenhuma chave privada entra no aplicativo ou no build. O controle offline não sincroniza prazos entre aparelhos nem impõe limite remoto de dispositivos.
- Android e iPhone têm armazenamento local separado. Usar o mesmo e-mail não transfere automaticamente o diário. A exportação é uma cópia JSON; não foi criada importação entre aparelhos ou sincronização em nuvem nesta etapa. Preservar o Android e seus backups.

## Compilar sem publicar

Na pasta `Nutria`, em PowerShell, com Node/npm e sessão EAS autorizada:

```powershell
npm ci
npm test
npm run lint
npm run typecheck
npx expo install --check
npx expo export --platform ios --output-dir ../../nutria-ios-export
npx eas-cli@latest build --platform ios --profile ios-simulator --non-interactive --no-wait
```

O perfil `ios-simulator` usa Release, ambiente preview e `ios.simulator: true`. Não precisa de assinatura Apple Developer e não gera IPA instalável no iPhone. Seu `.app` é empacotado pelo EAS em um arquivo para simulador. Para executá-lo, é necessário um simulador iOS no macOS ou um serviço remoto de simulador já autorizado. Este ambiente Windows não possui Xcode/iOS Simulator.

Em um Mac com simulador configurado, usar a sessão EAS do projeto e selecionar o build deste perfil:

```sh
npx eas-cli@latest build:run --platform ios
```

Para aparelho, o perfil `ios-device` usa distribuição interna e credenciais remotas. Só executar após confirmar assinatura, conta Apple Developer e dispositivos incluídos no provisionamento:

```powershell
npx eas-cli@latest build --platform ios --profile ios-device --non-interactive --freeze-credentials --no-wait
```

Não fornecer uma chave pública de testes na compilação. Chaves descartáveis são apenas para os testes locais da interface. Não executar `submit`, auto-submit, TestFlight ou publicação em loja nesta etapa. Contratos Apple, inscrição paga e declarações de exportação exigem decisão do proprietário; não aceitar nem preencher essas etapas automaticamente.

## Inspeção EAS em 04/11/2026

O projeto existente é `@whamudes-team/Nutria`. A consulta de builds iOS retornou zero builds anteriores. `device:list` informou que a conta `whamudes-team` não tem equipes Apple cadastradas. A inspeção de `credentials --platform ios`, no perfil `ios-device`, exibiu `No credentials set up yet!` para `app.nutria.mobile`; o login Apple foi recusado e nenhum certificado, perfil ou dispositivo foi criado/alterado.

Portanto, ainda não existe evidência de canal autorizado e compatível para gerar um IPA instalável. É preciso vincular uma conta Apple Developer elegível no fluxo seguro do EAS, disponibilizar certificado e provisionamento para este bundle e incluir o iPhone de teste no perfil ad hoc. Não enviar senhas, códigos 2FA, chaves ou certificados no chat. Se o proprietário já tiver conta ativa, pode ser reutilizada; não comprar uma inscrição por conta própria. TestFlight é outra distribuição e requer autorização específica.

## Critérios de teste iOS

1. Abrir em iPhone pequeno e em iPad, escolher Português e English, percorrer as cinco abas e conferir receitas, erros, números e datas. Reabrir e confirmar preferência persistida. Conferir VoiceOver, fontes ampliadas, áreas seguras e campos com teclado aberto.
2. Criar registros, pesos, favoritos e checklist. Alternar idioma, sair e entrar com o mesmo e-mail. Conferir nomes livres, porções, valores e registros preservados, sem duplicações.
3. Retomar o teste com o início original, inclusive no quinto dia. Conferir vencimento com o app aberto e ao retomar; tentar reiniciá-lo e confirmar bloqueio com dados mantidos.
4. Rejeitar código alterado, e-mail diferente, assinatura de outro emissor, licença vencida e relógio anterior. Ativar com código válido do emissor autorizado e conferir persistência no Keychain após reabrir/atualizar.
5. Exportar JSON no iPhone e iPad; abrir e cancelar o compartilhamento. Comparar os dados exportados sem confundir cancelamento com falha e confirmar que o popover fica ancorado no iPad. Opções do simulador podem diferir do aparelho.
6. Instalar uma atualização com mesmo bundle/assinatura, sem desinstalar. Confirmar idioma, prazo e dados. Não limpar o Keychain ou o AsyncStorage como parte da verificação.

Compilação não valida o fluxo externo Stripe → emissão → e-mail. O backend permanece em sua etapa de revisão e o Stripe em teste. Pagamento real, e-mail e publicação não fazem parte desta preparação iOS.

## Referências oficiais consultadas

Validação desta preparação: 30 testes e duas auditorias de tradução aprovados, lint/typecheck e compatibilidade Expo aprovados após atualização SDK 58, exportação iOS Hermes concluída com 118 assets. Regressões Chrome/Windows de idiomas e prazo aprovadas. Build de simulador solicitado: `e84afbcd-5e31-4e8c-9eae-5935d38a35bf`, fonte checkpoint `ff93c3bee76aa12466fd9a57736e63e808c29594`; acompanhar até o resultado antes de afirmar que o app iOS foi compilado. Execução nativa e aparelho permanecem pendentes. Consultar `12-retomada-ios-2026-11-04.md` para histórico, limitações e triagem de dependências.

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Build para simulador](https://docs.expo.dev/build-reference/simulators/)
- [Distribuição interna e provisionamento ad hoc](https://docs.expo.dev/build/internal-distribution/)
- [SecureStore e persistência do Keychain](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
- [Compartilhamento nativo e âncora no iPad](https://reactnative.dev/docs/share)
