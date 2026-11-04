# Ponto de retomada — 04/11/2026

Checkpoint registrado durante a pausa solicitada pelo proprietário. O proprietário retomou o trabalho depois com a mensagem **prossiga**; a atualização ao final registra o estado após a retomada. Não confundir os resultados históricos da pausa com os posteriores.

## Entrega Android preservada

- Nutria 0.7.0, Android versionCode 7, Português/English e teste de sete dias.
- APK: https://expo.dev/artifacts/eas/uYbNyb_q2jct-_99WmisH0FPYcu8iuukowNa4jc2jQQ.apk
- Código: PR #3, `nutria/portuguese-english`, commit `20b994f01ab44770fc96cce5b58b2460f6d75ca5`.
- Build EAS Android `4a6b8ad9-cab4-4c3d-84a2-7ad31474a70a` concluído. Pacote, manifesto, ZIP/CRC, bundle bilíngue e certificado igual ao APK anterior conferidos. SHA-256: `adee246bd0006c09fc9409c0241e91591277e3aa2f5c8b6ff7dd0abfd24e0f35`.
- Testes de código e navegador aprovados; teste físico Android ainda pendente. Arquivos e relatórios estão em `outputs/` na raiz do workspace.

## Preparação iOS salva

Checkout separado em `work/nutria-ios`, baseado no commit do PR #3. Alterações apenas em `Nutria/`:

- iOS buildNumber 8, mesmo `app.nutria.mobile`; Android permanece em versionCode 7.
- Perfis `ios-simulator` (Release, sem assinatura Apple) e `ios-device` (interno, credenciais remotas).
- Português/English declarados no Info.plist; a preferência do app continua independente e persistida.
- Formulários com KeyboardAvoidingView no iOS; escolha inicial com áreas seguras e rolagem.
- Compartilhamento com âncora visual e assunto no iPad/iPhone. A referência é acessada apenas no evento. O auxiliar do Perfil foi transformado em componente JSX para corrigir `react-hooks/refs`.
- Documentação detalhada em `11-ios-iphone.md` e referência no README.
- Instalação de dependências terminou antes da pausa, sem processo de instalação restante. `expo install --fix --npm` alinhou as versões recomendadas: Expo 58.0.23, linking 58.0.16, router 58.0.30 e safe-area-context 5.11.1; package-lock foi atualizado. Conferir os valores instalados ao retomar.

## Evidências e limites

Antes da atualização final de dependências: 30 testes e duas auditorias de tradução passaram. Lint passou após corrigir o componente de exportação; typecheck e auditoria passaram após a correção. Essas verificações precisam ser repetidas com as dependências atualizadas.

A consulta online `expo install --check` indicou as atualizações, depois aplicadas por `expo install --fix`. A confirmação final de compatibilidade ainda está pendente. O npm informou 12 vulnerabilidades moderadas e um script de instalação do `unrs-resolver` não aprovado; não foi executado `audit fix --force` nem feita mudança global de proteção. Avaliar o relatório e a necessidade real do script sem aprovar automaticamente.

A exportação Metro iOS foi iniciada e interrompida antes da atualização de dependências; não foi concluída nem serve como evidência de build. **Nenhum build iOS foi solicitado ao EAS até esta pausa.** Não existe IPA ou simulador iOS compilado nesta etapa. O Windows não possui Xcode/iOS Simulator, portanto não há execução nativa confirmada.

## Acesso iOS existente inspecionado

- Sessão EAS: `whamude`, equipe `whamudes-team`, projeto `@whamudes-team/Nutria`.
- Consulta de builds iOS: zero builds anteriores.
- `device:list`: `No Apple teams found for account whamudes-team.`
- `credentials --platform ios`, perfil `ios-device`, bundle `app.nutria.mobile`: `No credentials set up yet!`.
- O login Apple foi recusado e a inspeção encerrada. Não houve criação/alteração de certificado, perfil, dispositivo, assinatura, contrato ou publicação.

Para IPA de aparelho faltam conta Apple Developer elegível vinculada, assinatura/provisionamento deste bundle e iPhone incluído no perfil. Não solicitar senhas, 2FA, tokens ou chaves no chat. Não comprar inscrição nem publicar no TestFlight/App Store sem autorização específica. O simulador pode ser compilado sem conta Apple Developer.

## Próximos passos concretos

1. Ler `AGENTS.md`, este registro e `11-ios-iphone.md`. Conferir branch e diferenças salvas, sem sobrescrever os checkouts Android/bilíngue.
2. Validar novamente `npm test`, `npm run lint`, `npm run typecheck` e `expo install --check`; revisar as alterações do lockfile. Usar o cache npm dentro de `work/`, sem alterar permissões globais. A consulta de compatibilidade pode usar `EXPO_NO_CACHE=1` para evitar escrita no cache global do Expo.
3. Concluir `expo export --platform ios` e regressões de navegador de idiomas/prazo com chave pública descartável aplicada somente ao servidor de testes. Nunca distribuir essa chave.
4. Registrar o código final revisável, solicitar uma única compilação `ios-simulator` e acompanhar o ID até concluir. Não repetir se já houver build em andamento. Conferir o `.app`, Info.plist, bundle e versão do artefato.
5. Executar no simulador Mac/remoto autorizado e, quando existir conta/provisionamento/aparelho, testar fisicamente conforme `11-ios-iphone.md`. Separar código preparado, testes locais, build e execução nativa confirmada.

O bloqueio de rede `EACCES` é diferente do erro de serviço `Unable to verify model access right now`. O primeiro foi superado com `request_permissions` para rede, com escopo de turno; não presumir que a permissão persistirá amanhã. O segundo não teve causa interna confirmada nem correção comprovada. Não usar `sandbox_permissions=require_escalated`, contornar revisão/permissões ou alterar modelo/proteções globais.

Dados dos usuários, chaves de persistência, licenças, início dos sete dias, fontes originais das receitas e APK entregue permanecem preservados. Não houve merge, publicação em loja, mudança de Stripe ou publicação de backend. Não há sincronização automática Android → iOS nesta versão.

## Atualização após a retomada autorizada

O checkpoint foi salvo na branch `nutria/ios-preparation`, commit `ff93c3bee76aa12466fd9a57736e63e808c29594`, e em JSON/ZIP locais em `outputs/Nutria-iOS-checkpoint-2026-11-04.*`.

Com as dependências atualizadas: 30 testes, duas auditorias, lint, typecheck e `diff --check` aprovados. A consulta online `expo install --check` confirmou dependências atualizadas. A exportação iOS foi concluída: 1437 módulos, 118 assets e bundle Hermes `entry-60e9f7ff1ab01f97e86f0736324086c6.hbc`, 3.361.489 bytes, em `work/nutria-ios-export`.

Os testes Chrome/Windows de idiomas e prazo passaram sem erros de navegador: seleção persistida, cinco abas, receitas, checklist, formatos, textos livres, ativação assinada de teste, registros/backup e início do período preservados; quinto dia e vencimento com app aberto também confirmados. Isso é evidência de navegador e código compartilhado, não execução iOS.

Uma compilação `ios-simulator` foi solicitada com snapshot local correspondente ao checkpoint `ff93c3b`, chave pública original e sem credenciais Apple. ID: `e84afbcd-5e31-4e8c-9eae-5935d38a35bf`; fingerprint: `d41259b7984fb459f0ec208aa92c5437b5b3990b`. Acompanhar essa mesma solicitação; não iniciar outra por falta de resposta imediata. O EAS advertiu que a declaração `ITSAppUsesNonExemptEncryption` não foi preenchida; ela continua pendente de decisão do proprietário antes de eventual App Store Connect/TestFlight. Não preencher declaração legal automaticamente para silenciar o aviso.

A consulta `npm audit --json` após a atualização confirmou 12 achados moderados, nenhum alto/crítico, nas cadeias de ferramentas Expo/ESLint/glob/minimatch. As correções sugeridas pelo npm incluíam regressar para Expo 52 e ESLint config 6, incompatíveis com a preparação SDK 58; não aplicar `audit fix --force`. Esses achados permanecem registrados para triagem; não afirmar que a atualização os corrigiu.

## Encerramento seguro solicitado pelo proprietário

O proprietário pediu novamente para encerrar em 04/11/2026. Trabalho pausado: não iniciar novas verificações, instalações ou compilações durante a pausa. O servidor local Metro de testes foi encerrado. Instalações e testes anteriores terminaram; não há instalação local em andamento.

Na última consulta, o build iOS `e84afbcd-5e31-4e8c-9eae-5935d38a35bf` estava **IN_PROGRESS**, perfil `ios-simulator`, versão 0.7.0/build 8. Ele já está no serviço remoto Expo e pode terminar independentemente deste chat. Não cancelar nem duplicar a solicitação. Na retomada, consultar esse ID primeiro, baixar e verificar o artefato se concluído, ou investigar o erro se houver. Não afirmar sucesso de compilação ou execução nativa antes dessa conferência.

Link de acompanhamento: https://expo.dev/accounts/whamudes-team/projects/Nutria/builds/e84afbcd-5e31-4e8c-9eae-5935d38a35bf

As credenciais Apple continuam ausentes e nenhum IPA de aparelho foi solicitado. Permanecem pendentes conta Apple Developer/provisionamento/aparelho para teste físico, execução nativa do simulador e decisões sobre exportação/loja antes de qualquer submissão. APK Android bilíngue preservado. Sem merge nem publicação.
