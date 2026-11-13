MARMITA FÁCIL — PONTE OFICIAL DO WHATSAPP

ESTADO DA ENTREGA
Código e testes de integração preparados. Nenhum número foi cadastrado e nenhum
serviço foi publicado. Nenhuma mensagem real foi enviada. A integração só estará
ativa após cadastrar o número na Meta, configurar credenciais, publicar HTTPS,
executar o servidor e o worker, conectar o APK e publicar o cardápio.

COMO FUNCIONA
Cliente -> WhatsApp Cloud API -> webhook HTTPS -> fila SQLite -> atendimento
guiado -> confirmação explícita do cliente -> pedido durável no servidor ->
sincronização pelo APK -> gravação local -> confirmação de importação (ACK).

Cada negócio precisa de seu próprio número, implantação, arquivo SQLite e chave.
Um servidor atende exatamente um WHATSAPP_PHONE_NUMBER_ID. Um webhook de outro
número é recusado. Os pedidos não são compartilhados entre negócios.

O uso manual do APK continua disponível sem internet. O fluxo WhatsApp depende
de internet e do serviço hospedado. Sem rede no celular, pedidos confirmados
permanecem guardados no servidor e aguardam a próxima sincronização. Recebimento
no Android não é instantâneo garantido: o APK verifica periodicamente quando
aberto e pode ter tarefas em segundo plano sujeitas às restrições do Android.
Desconectar o APK interrompe sua sincronização; NÃO desativa o atendimento do
servidor. Para pausar novos pedidos, publique accepting_orders=false no cardápio
(opção Pausar pedidos automáticos do APK) e confira a resposta do servidor.

FLUXO DO CLIENTE
1. O cliente envia uma mensagem ao número da empresa.
2. Recebe saudação, cardápio semanal, dias disponíveis e preços unitários.
3. Escolhe a entrega em DD/MM/AAAA.
4. Informa número da opção x quantidade, por exemplo: 1x2, 3x1.
5. Informa nome, endereço e observações (SEM quando não houver observações).
6. Recebe resumo com preço por unidade, subtotal, total e dia da entrega.
7. Somente a palavra CONFIRMAR registra o pedido. SIM não confirma por engano.

MENU ou RECOMEÇAR reiniciam o rascunho. CANCELAR descarta um rascunho, mas não
cancela silenciosamente um pedido já confirmado. ATENDENTE pausa o robô e mostra
HUMAN_CONTACT_TEXT, que deve conter um contato humano real, como outro telefone.
Só retome automaticamente com MENU/RECOMEÇAR. Áudio, foto, localização e linguagem
livre não são interpretados como itens/preços: o bot orienta o uso de texto.
Não há IA generativa nem cobrança automática nesta versão.
Após 24 horas sem mensagens, uma nova conversa inicia a saudação e o cardápio
novamente, preservando os pedidos anteriores. Uma pausa explícita por ATENDENTE
continua pausada até MENU/RECOMEÇAR, mesmo depois desse período.

PREÇOS E DISPONIBILIDADE
O cardápio começa na segunda-feira e termina no domingo seguinte. Cada marmita
tem preço em centavos e uma lista de datas disponíveis daquela semana. O bot
aceita apenas datas de hoje ou futuras no fuso BUSINESS_TIMEZONE. Toda publicação
incrementa revision. Alteração de cardápio exige uma nova seleção antes de uma
confirmação, para evitar aceitar preços antigos sem conferir. Pedidos já
registrados preservam seus próprios preços e dados do cliente.
accepting_orders=false pausa novos pedidos e impede confirmar rascunhos abertos.
Nenhum pedido confirmado é apagado ao pausar o atendimento.

CONFIGURAÇÃO E ATIVAÇÃO REAL
1. Obtenha um número destinado a vendas e configure uma conta WhatsApp Business
   Platform/Cloud API pela Meta ou por um provedor oficial. O APK não converte um
   WhatsApp comum em uma API. Para usar também WhatsApp Business no telefone,
   verifique a elegibilidade e o onboarding oficial de coexistência. Não apague
   nem migre uma conta existente sem revisar o fluxo oferecido pela Meta.
2. Crie/configure o app Meta e o acesso autorizado à conta WhatsApp. Obtenha o
   phone_number_id, token de acesso com permissão de mensagens e app secret.
   A validade e a renovação do token dependem da configuração da conta Meta.
3. Provisione uma hospedagem Linux com Python 3.11 ou superior, disco persistente
   e HTTPS público com certificado válido. Use um domínio/serviço por negócio.
4. Instale requirements.txt em ambiente virtual. Configure as variáveis listadas
   em .env.example no gerenciador de processos da hospedagem. O arquivo .env não
   é carregado automaticamente e não deve ser enviado ao APK nem ao repositório.
5. Gere OWNER_API_TOKEN e WEBHOOK_VERIFY_TOKEN independentes e aleatórios, com
   pelo menos 32 caracteres. Não use o token da Meta como chave do APK.
   META_GRAPH_VERSION é obrigatório: informe a versão suportada/configurada em
   seu app Meta, no formato vNUMERO.0. Ela nunca é alterada automaticamente.
6. Configure HUMAN_CONTACT_TEXT com um contato humano efetivo. Só diga que a
   equipe responderá pelo mesmo WhatsApp se houver operador/inbox realmente
   acompanhando esse canal (por exemplo, coexistência oficial configurada).
7. Execute o WSGI e o worker como DOIS processos supervisionados, com o MESMO
   arquivo DATABASE_PATH persistente e as mesmas variáveis de ambiente:
      gunicorn --workers 2 --bind 127.0.0.1:8080 'service:create_app()'
      python service.py worker
   Coloque o WSGI atrás de proxy HTTPS (Nginx/Caddy/plataforma equivalente).
   Não exponha o servidor de teste do Python diretamente à internet.
8. Cadastre na Meta o callback https://SEU-DOMINIO/webhook e o verify token.
   Faça a verificação de desafio e assine o campo messages da conta correta.
   Eventos POST são aceitos somente com X-Hub-Signature-256 válido.
9. Conecte o APK usando apenas a URL HTTPS e OWNER_API_TOKEN. Publique o nome,
   saudação e cardápio com os dias/preços corretos. Revise o cardápio retornado.
10. Só após revisar a configuração, configure WHATSAPP_SEND_ENABLED=true e
    reinicie o worker. False é o padrão, impedindo envios reais acidentais.
11. Faça um teste autorizado com o número de teste/conta Meta e um telefone seu:
    saudação -> cardápio -> data -> itens -> nome -> endereço -> observação ->
    CONFIRMAR -> sincronização -> pedido único no APK -> ACK. Teste também pausa,
    falta de rede e retorno da rede antes de receber pedidos do negócio.

A conta, disponibilidade de coexistência, aprovação e condições da Meta devem
ser verificadas no onboarding real. Hospedagem e uso da plataforma podem ter
custos. Esta entrega não contrata serviços nem presume preços, aprovação ou
disponibilidade da conta. Nenhuma chave ou senha real deve ser enviada no chat.

API DO APK — PROTOCOLO 1
Todas as rotas /api/v1 exigem Authorization: Bearer OWNER_API_TOKEN e HTTPS
externo. O servidor não redireciona chamadas e não habilita CORS público.
Erros são objetos JSON {"error":"mensagem"}. Requisições limitadas a 1 MB.

GET /api/v1/health
  {"ok":true,"protocol":1,"business_name":"...","phone_number_id":"..."}
GET /api/v1/menu
  Cardápio publicado ou {} quando ainda não houver publicação.
PUT /api/v1/menu
  {"business_name":"...","greeting":"...","accepting_orders":true,
   "week_start":"2026-11-09","week_end":"2026-11-15",
   "items":[{"local_meal_id":1,"name":"Tradicional","description":"...",
     "price_cents":2000,"available_dates":["2026-11-13","2026-11-14"]}]}
  Retorna o objeto normalizado com revision gerada no servidor.
GET /api/v1/orders?limit=100
  {"phone_number_id":"...","orders":[
   {"external_id":"UUID","customer":{"name":"...","phone":"5511...",
    "address":"..."},"ordered":"AAAA-MM-DD","delivery":"AAAA-MM-DD",
    "status":"pending","notes":"...","items":[{"local_meal_id":1,
    "name":"Tradicional","quantity":2,"unit_price_cents":2000}]}]}
  Só retorna pedidos ainda não confirmados pelo APK; limit entre 1 e 100.
POST /api/v1/orders/UUID/ack
  {"local_order_id":42} -> {"ok":true}
  Enviar só DEPOIS do commit local. Repetir o mesmo ACK é seguro. Outro ID local
  para um pedido já associado é recusado. O APK também deduplica por origem e
  external_id, protegendo contra repetição quando a resposta do ACK se perde.

SEGURANÇA E OPERAÇÃO
- Credenciais Meta ficam somente no servidor. A chave do APK dá acesso aos
  pedidos e permite publicar cardápio: mantenha-a privada, uma por negócio.
- O webhook confirma HTTP 200 apenas após gravar o evento em SQLite. Falha de
  disco/banco retorna 503 para a Meta poder repetir. message_id é único.
- O processamento de uma mensagem, estado da conversa, criação do pedido e
  gravação da resposta na outbox ocorrem na mesma transação SQLite.
- O worker pode ser reiniciado. Há deduplicação de pedidos e serialização do
  processamento. O envio de mensagens tem retry limitado e lease de trabalho.
- Em falha ambígua de rede depois do aceite Meta, uma RESPOSTA pode ser repetida
  ao tentar novamente. A API da Meta não oferece aqui uma transação distribuída
  com SQLite. Isso não cria pedidos duplicados: confirmação tem chave única.
- Respostas longas são divididas em partes com até 3500 unidades UTF-16, em ordem
  por destinatário. A versão atual não usa templates fora da janela24h.
- Janela de 24 horas é calculada a partir do timestamp da última mensagem Meta
  recebida do cliente. Respostas expiradas não são enviadas. Não há campanhas,
  disparo de cardápio não solicitado nem mensagens programadas fora da janela.
  Uma nova mensagem não ressuscita respostas antigas aguardando na fila: cada
  resposta também expira 24 horas depois da mensagem que a originou.
- Aceite HTTP da Meta não significa entrega: acompanhe os diagnósticos Meta.
  Eventos de status são reconhecidos sem alterar o estado do pedido.
- Monitore processos, espaço em disco, erros, TLS e renovação das credenciais.
  Falhas permanentes de envio ficam em outbox.state=failed; não são apagadas.
- Faça backup consistente do banco SQLite com a API de backup do SQLite ou
  com os processos parados. Proteja banco e backups; contêm telefone/endereço.
  Este protótipo não possui painel de retenção/exclusão nem criptografia própria
  de banco: configure disco/backups protegidos e política operacional adequada.

TESTAR SEM CONTA, SEM INTERNET EXTERNA E SEM ENVIAR MENSAGENS
No diretório deste projeto:
  python -m unittest -v test_service.py
Os testes usam banco temporário e transporte Meta falso. Um teste sobe apenas
um servidor HTTP em 127.0.0.1 para exercitar o WSGI real. Não chamam a Meta.
  python service.py serve --port 8080
Esse segundo comando exige configuração válida e serve somente localhost.
O módulo não inicia o servidor nem envia mensagens quando apenas importado.

FONTES OFICIAIS CONSULTADAS
https://developers.facebook.com/documentation/business-messaging/whatsapp/overview/
https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
As regras, versões e disponibilidade devem ser confirmadas ao ativar a conta.
