# Nutria — servidor de ativação (somente testes)

## Estado real

Código implementado e testado localmente. **Não publicado, sem webhook registrado no Stripe e sem serviço de e-mail contratado/configurado.** Não houve envio real nem teste ponta a ponta com um pagamento da conta Stripe.

O plugin Stripe conectado ao chat criou o catálogo, mas não fornece credenciais ao servidor ou ao Stripe Projects CLI. A instalação dos plugins Directory/Projects neste ambiente pediu login; a chamada de autenticação foi recusada pela rede. Nenhum provedor foi escolhido ou provisionado. O próximo passo operacional é autorizar o provisionamento e escolher hospedagem com Node 24, HTTPS e volume persistente, além de um serviço de e-mail com remetente autorizado. Não é necessário domínio próprio para a URL do webhook. Sem domínio/remetente, o modo preview permite validar o e-mail sem enviá-lo.

## Fluxo

1. Stripe envia uma notificação assinada para `POST /stripe/webhook`.
2. O servidor verifica a assinatura sobre o corpo original, o ambiente e recupera a fatura pela API na conta configurada.
3. Apenas fatura paga de criação/renovação, em BRL, com pagamento mínimo de 850 centavos e uma linha do preço esperado, sem proporcionalidade, gera licença. Não emitir a partir da página de sucesso.
4. O código NTR1 usa o e-mail da fatura e o fim do período daquela linha paga; não adiciona 30 dias arbitrários.
5. SQLite registra a fatura e o mesmo código na fila antes de confirmar o evento. O worker tenta entregar a cada 15 segundos. Reiniciar o processo mantém a fila.
6. Renovação gera novo código com o novo vencimento; pagamento falho/cancelamento não prorroga acesso. Os códigos já enviados continuam válidos até vencer: o APK offline não oferece revogação imediata.

E-mails precisam usar o mesmo endereço do teste gratuito para preservar os registros. A renovação nesta etapa é por novo código enviado por e-mail, que o cliente cola no aplicativo. Não há login online/renovação silenciosa no APK.

## Recursos de teste já criados

- Conta: expertX, modo teste.
- Produto: `prod_VYXiyICQyJ6vE9`.
- Preço BRL 8,50/mês: `price_1UXQczRbC2nY3V8sUkUYoi8q`.
- Link: https://buy.stripe.com/test_eVq5kF3Sr5j0aRIfRM3Je00
- Nenhum segundo teste gratuito no Stripe: as 96 horas já são oferecidas no aplicativo.

## Configuração segura

O servidor recusa modo real e aceita apenas chave restrita `rk_test_`. O startup confere a conta e o preço pela API. A chave restrita precisa de leitura de Account, Prices, Invoices/linhas, Subscriptions e Checkout Sessions. Configure permissões mínimas e ajuste somente se a API indicar falta de permissão.

Segredos no cofre da hospedagem: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `NUTRIA_ISSUER_PASSWORD` e credenciais SMTP. Monte `NUTRIA_ISSUER_FILE` como arquivo secreto protegido. É o mesmo arquivo privado protegido do gerador offline: a chave pública derivada precisa coincidir com a do APK. Nunca colocar arquivo privado, senha ou segredo em Git, chat, APK ou logs.

O arquivo `.env.example` contém somente nomes/placeholders e IDs públicos. Para desenvolvimento local, copie para `.env` nesta pasta e preencha no seu computador. `.env` e `data/` são ignorados pelo Git. Em produção futura, usar o cofre do provedor e acesso restrito aos backups do volume: a fila contém e-mails e códigos de acesso.

- `DELIVERY_MODE=preview`: grava arquivos `.eml` privados em `DATA_DIR`, sem enviar mensagens. Abrir no cliente de e-mail para revisar.
- `DELIVERY_MODE=smtp`: exige SMTP autenticado/TLS e remetente autorizado pelo provedor.
- `TEST_RECIPIENT`: um único destinatário permitido; outras entregas ficam pendentes. Não usar o endereço de terceiros para testes.

## Executar

Node.js 24 ou superior:

```sh
cd Nutria/server
npm ci
npm test
npm start
```

Configure o endpoint no Workbench do Stripe na MESMA conta de teste e versão de API `2026-10-28.endive`, com:

- `invoice.paid`, `invoice.payment_failed`;
- `checkout.session.completed`, `checkout.session.async_payment_succeeded`;
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`;
- `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`.

Falhas e alterações de assinatura são registradas e não emitem códigos. Reembolso, disputa e alerta de fraude são guardados em `reviews` para análise manual; **esta versão não resolve o vínculo dessas ocorrências com assinaturas nem aplica bloqueio online**. Por isso não está pronta para produção. E-mail enviado é uma aceitação do SMTP, não confirmação de chegada na caixa de entrada. Ainda faltam bounces, monitoramento e política de retenção de dados.

SQLite exige disco persistente e uma única instância do servidor. Não usar armazenamento efêmero/serverless sem adaptar a persistência. Há deduplicação de emissão por fatura. O envio SMTP é ao menos uma vez: se o processo cair após o provedor aceitar a mensagem e antes da confirmação local, pode haver reenvio do MESMO código; Message-ID estável ajuda a identificação, mas não garante deduplicação no provedor.

Docker: executar `docker build -f server/Dockerfile .` a partir de `Nutria/`, montar `/data` persistente e o arquivo privado como segredo. O Dockerfile copia somente os fontes/manifestos necessários e a configuração pública. Não foi feito deploy nem executado build Docker nesta entrega.

## Antes de cobrar de verdade

Implementar tratamento operacional dos eventos de risco, cancelamento/reembolso conforme a política comercial, acompanhamento dos envios, backups, testes em dispositivo e revisão fiscal (incluindo Stripe Tax, se aplicável). Esta versão recusa credenciais/eventos reais deliberadamente. Não basta trocar uma flag para entrar em produção.
