# Registro consolidado do Nutria — 02/11/2026

Este documento registra decisões, entregas, evidências e pendências da sessão. Não é uma transcrição integral. Escopo autorizado: exclusivamente a pasta Nutria/ do repositório Whamude/PowerBI-DataScience.

## Onde está cada entrega

| Entrega | Local / situação |
| --- | --- |
| Chave pública real configurada | master, commit 610c90b6f62e77c2b42e62764c110517844d86e3 |
| Nutria 0.5 com teste experimental | master, commit e7397067fb6324c65e338767ec1ff412f3d79b92 |
| Servidor de ativação após pagamento | branch nutria/stripe-activation-test, commit 187c849ddd33b91861c28c731074c491083714d4 |
| Revisão do backend | [PR #1](https://github.com/Whamude/PowerBI-DataScience/pull/1), aberto como rascunho, não integrado à master no momento deste registro |
| Documentação operacional | [server/README.md](../server/README.md), [teste experimental](08-teste-experimental.md), [ativação](07-ativacao-email.md) |

A atualização direta da master com o backend foi recusada pela revisão automática por considerar a alteração da branch principal compartilhada sem autorização específica. A alternativa autorizada pela revisão foi usada: branch separada e PR em rascunho. Não presumir merge nem deploy.

## Ativação individual e chaves

O proprietário forneceu somente o arquivo público nutria-chave-publica-9def3ab908ff7344.json. A chave pública e seu identificador foram validados e registrados em src/auth/activation-config.json:

- Identificador: 9def3ab908ff7344.
- Chave pública: A6YapYenpBSJ30slHiRP1dW3GHil-sdFofxEaE-geqs.
- Códigos NTR1 assinados com Ed25519, vinculados ao e-mail normalizado, com vencimento opcional.
- O mesmo e-mail mantém o mesmo espaço de dados locais na renovação.
- O proprietário deve continuar usando a MESMA chave privada protegida no gerador offline. Não gerar uma nova chave para cada cliente.
- Nenhuma chave privada, senha de emissão, chave secreta Stripe ou credencial SMTP foi recebida ou registrada no Git.
- O código identifica o texto do e-mail; não autentica uma conta online. Não há limite robusto por aparelho nem revogação imediata offline.

## Compilações e evidência de uso

A tentativa de build neste ambiente falhou com “The bearer token is invalid” no Expo. A presença de EXPO_TOKEN no ambiente não comprovou sua validade.

O usuário fez login no Expo no Windows, gerou o build pelo EAS e confirmou “ok funcionou”. A captura anterior mostrava:
https://expo.dev/accounts/whamudes-team/projects/Nutria/builds/d9f60df8-3a6e-4a1f-b294-7ee1d135f278

Essa confirmação ocorreu ANTES da implementação do teste experimental 0.5. Não interpretar como validação física independente do app, nem como confirmação de build/instalação da 0.5.

No Windows, o comando foi inicialmente colado duas vezes; após correção, a falta de Git foi contornada com EAS_NO_VCS=1 para o ZIP baixado. A chave Android gerenciada existente foi reutilizada.

Preservar: projeto @whamudes-team/Nutria, project ID 3fcedfe1-f754-4191-be79-eb7350492f26, identificador app.nutria.mobile e assinatura Android existente. Preview produz APK; production produz AAB.

## Nutria 0.5: quatro dias experimentais

O usuário pediu quatro dias de uso sem ativação. Foi implementado:

- Início voluntário com e-mail válido, sem código e sem cartão.
- 96 horas corridas desde o primeiro início, contando com o app fechado.
- Prazo persistido; sair, reabrir e retomar não reiniciam o teste.
- Um teste por instalação, ligado ao primeiro e-mail; outro e-mail não cria novo prazo nessa instalação.
- Verificação ao abrir, voltar ao primeiro plano e a cada 30 segundos.
- Vencimento exige código. O Perfil permite sair para ativar antes do prazo.
- Ativação com o mesmo e-mail preserva diário e preferências.
- Dados de teste em SecureStore no Android/iOS; armazenamento local no navegador.
- Recuo observado do relógio superior a cinco minutos encerra o teste. Não há relógio confiável offline.
- Android: reinstalar/apagar dados pode reiniciar elegibilidade. Navegador: limpar dados pode fazer o mesmo. iOS pode preservar SecureStore após reinstalação. Controle por pessoa em vários aparelhos exige backend.
- Versão 0.5.0, Android versionCode 5, iOS buildNumber 5.

Verificações executadas: lint, typecheck, 24 testes do aplicativo, fluxo web automatizado e exportação do bundle Android. O fluxo web cobriu início/saída/reabertura, isolamento de e-mail, vencimento com app aberto, impossibilidade de reiniciar prazo e ativação preservando os dados. Não foi gerado um novo APK 0.5 nesta sessão após essa implementação.

## Decisão comercial e Stripe

Decisões explícitas do proprietário:

- Assinatura mensal, R$ 8,50.
- Stripe como plataforma de cobrança.
- Desenvolvimento inicialmente somente em modo de teste.
- Quatro dias gratuitos continuam no app; não foi criado outro período gratuito no Stripe.
- O proprietário informou não ter domínio nem e-mail em domínio próprio.

Plugin Stripe instalado e conta expertX autorizada em modo teste. Recursos realmente criados:

| Recurso | Identificador |
| --- | --- |
| Conta de teste | acct_1USiEIRbC2nY3V8s |
| Produto “Nutria — Assinatura mensal” | prod_VYXiyICQyJ6vE9 |
| Preço: BRL 850 centavos / 1 mês | price_1UXQczRbC2nY3V8sUkUYoi8q |
| Payment Link | plink_1UXQdTRbC2nY3V8sRvazIh0Z |

Link de teste: https://buy.stripe.com/test_eVq5kF3Sr5j0aRIfRM3Je00

O link está em modo teste, sem cobranças reais; sua confirmação informa que a liberação automática está em preparação. Não há evidência de pagamento ponta a ponta por esse link nesta sessão. Instalar/conectar o plugin não instala um servidor contínuo nem transmite suas credenciais ao backend.

## Servidor de entrega automática: código pronto para testes locais

Local: server/, exclusivamente na branch/PR indicada acima.

- Node.js 24, Stripe SDK 23.1.0, API fixada em 2026-10-28.endive, SQLite e transporte SMTP ou preview EML.
- POST /stripe/webhook verifica assinatura Stripe sobre o corpo original.
- Recupera faturas pela API; confere ambiente teste, assinatura/cliente, preço esperado, BRL e pagamento mínimo de R$ 8,50.
- Emite apenas para faturas pagas de criação/renovação; a implementação atual não libera por fatura manual, proporcionalidade, desconto abaixo de R$ 8,50 ou pagamento zero.
- Vencimento derivado do fim do período da linha da fatura paga; não soma arbitrariamente 30 dias.
- Desbloqueia o arquivo privado protegido do gerador somente no servidor e confere correspondência com a chave pública do APK.
- SQLite mantém fila persistente e deduplicação por fatura. Falha de SMTP deixa o mesmo código pendente para nova tentativa.
- SMTP pode reenviar o MESMO código se houver queda entre aceitação e confirmação local; não há garantia de entrega exatamente uma vez.
- Modo preview gera EML local, sem enviar e-mail real.
- No modo SMTP de teste, um único TEST_RECIPIENT é permitido.
- Pagamento falho e alterações de assinatura não geram prorrogação. Eventos de reembolso, disputa e fraude entram em fila de revisão; não há bloqueio online.
- Versão recusa pagamentos reais e exige chave restrita de teste. Dockerfile e configuração de exemplo não contêm segredos.
- Backend excluído do pacote EAS; não há chave privada no APK.
- A cada mensalidade paga, o cliente ainda receberá um novo código para colar no Nutria. Renovação silenciosa no app NÃO foi implementada.

Verificações: seis testes de servidor aprovados, incluindo compatibilidade criptográfica com o app, rejeição de assinatura HTTP falsa, deduplicação de eventos/faturas, rejeição de faturas inelegíveis e reenvio após reinício/falha. Junto dos 24 testes do app, total de 30 aprovados. Lint, typecheck e sintaxe dos fontes do servidor também passaram.

## Infraestrutura: o que NÃO foi concluído

- Nenhum servidor/hospedagem foi provisionado ou publicado.
- Nenhum webhook público foi registrado no Stripe.
- Nenhum provedor de e-mail ou remetente foi configurado.
- Nenhum e-mail real foi enviado.
- Nenhuma chave privada foi instalada no servidor.
- Nenhum pagamento real foi criado/cobrado.
- Não houve teste ponta a ponta com pagamento da conta Stripe e recebimento real do código.
- Não houve build Docker nem deploy.

Foi instalado o Stripe CLI 1.55.6 no ambiente de trabalho. A consulta ao Stripe Directory retornou HTTP 403. A instalação dos plugins Directory/Projects pediu login separado e a chamada de autenticação foi recusada pela rede. A conexão MCP do Stripe não fornece esse login. Não contornar a política de rede nem presumir provedor contratado.

## Próximos passos para continuidade

1. Revisar o PR #1 e decidir a integração do backend; não presumir autorização de merge.
2. Resolver a autenticação/rede da ferramenta de provisionamento e consultar o catálogo antes de escolher serviços.
3. Selecionar hospedagem Node 24 com HTTPS e volume persistente. A implementação SQLite pressupõe uma instância; não publicar em disco efêmero/serverless sem adaptação.
4. Configurar remetente autorizado e destinatário de teste; sem serviço de envio, usar somente preview EML. Não prometer envio irrestrito sem domínio/remetente validado.
5. Colocar credenciais no cofre da hospedagem e montar a chave privada protegida como segredo. O proprietário faz isso fora do chat.
6. Registrar o webhook na mesma conta/ambiente teste e executar pagamento simulado, conferir e-mail, vencimento, renovação, duplicatas e falhas.
7. Antes de produção: resolver operacionalmente eventos de risco/reembolsos, cancelamentos, entrega/bounces, monitoramento, backups, privacidade/retenção e tributação/Stripe Tax quando aplicável.
8. Integrar autenticação e consulta de assinatura no app se for desejada renovação automática sem colar códigos.
9. Testar em aparelhos e gerar novo APK para mudanças no aplicativo; preservar dados e assinatura Android.

## Como retomar em outra conversa

Ler este documento, AGENTS.md, README.md, docs/08-teste-experimental.md e server/README.md na branch nutria/stripe-activation-test. A master contém o aplicativo 0.5; o backend continua no PR #1 até integração explícita.

Os ZIPs antigos de backup 0.3/0.4 são históricos e NÃO contêm as entregas atuais. Baixar a branch correta para obter também o servidor. Não reutilizar credenciais de outra sessão nem apresentar testes locais como deploy ou envio real.
