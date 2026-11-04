# Nutria 0.6 — teste experimental

- Início voluntário com e-mail válido, sem código: 168 horas corridas, uma vez por instalação.
- E-mail normalizado identifica a mesma conta local usada pela licença assinada. Ativar com o mesmo e-mail preserva os registros; outro e-mail tem dados separados.
- Início, último horário observado, encerramento e saída são persistidos em SecureStore no Android/iOS e AsyncStorage no navegador. Sair mantém o prazo e exige retomar manualmente. Fechar o app não pausa o teste.
- Checagem ao abrir, voltar ao primeiro plano e a cada 30 segundos. Vencimento ou recuo observado do relógio superior a 5 minutos encerra o teste. Depois de registrado, o encerramento não é desfeito ao voltar o relógio. Não há relógio confiável offline.
- Stack.Protected continua controlando todas as rotas privadas, agora com licença válida ou sessão experimental válida. Depois do vencimento, a tela de ativação informa que os registros estão preservados.
- Uma licença assinada válida encerra a elegibilidade experimental da instalação. Código inválido não altera o teste. A licença pode recuperar metadados experimentais corrompidos.
- A chave privada permanece exclusivamente com o proprietário; o APK contém somente a chave pública já configurada.

## Atualização de instalações existentes

A versão 0.6 amplia o prazo para 7 dias (168 horas), contados do mesmo `startedAt` já salvo. O formato do registro e as chaves de armazenamento permanecem os mesmos. Um teste ainda em andamento ganha o prazo maior sem reiniciar o contador; sair e reabrir continuam preservando o início. Registros já marcados como encerrados, inclusive por ativação assinada, não são reabertos pela atualização. Assinaturas pagas, códigos existentes e dados separados por e-mail mantêm as regras anteriores.

## Limites

O teste não verifica a posse da caixa postal. Não garante um teste por pessoa em vários aparelhos. Apagar os dados/reinstalar no Android ou limpar o armazenamento no navegador pode reiniciar a elegibilidade. SecureStore pode persistir no iOS após reinstalação. Limite robusto por usuário, revogação remota e tempo confiável exigem backend.

## Verificação

`npm run lint`, `npm run typecheck` e `npm test` incluem cenários de 168 horas, vencimento exato, reinício/saída, troca de e-mail, relógio e preservação do identificador dos dados. O script `tests/browser-trial.cjs` valida o fluxo web com uma chave pública descartável; nunca usar essa chave no APK de produção.

Para executar o teste de navegador no Windows, configure `NUTRIA_CHROMIUM_EXECUTABLE` com o caminho de um Chrome/Chromium instalado. O teste exige Playwright e o servidor web de testes na porta 8082; essa configuração é exclusiva dos testes.

## APK

Versão 0.6.0, Android versionCode 6, iOS buildNumber 6. Baixar o código atualizado e gerar novo APK com `npx eas-cli@latest build --platform android --profile preview`. Instalar sobre a versão anterior preserva os dados, desde que a chave Android seja a mesma. Testes físicos Android/iOS ainda são necessários.
