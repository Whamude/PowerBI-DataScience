# Processo registrado — 13/11/2026

## Requisitos e esclarecimentos do proprietário

1. Criar um APK de gestão de vendas de marmitas.
2. Cadastrar clientes, tipos diferentes de marmita e seus preços.
3. Registrar quantidades, dia do pedido, entrega, valor unitário e total.
4. Identificar A entregar, Entregue e Cancelado com cores diferentes.
5. Permitir instalar em vários celulares, com uso e registros independentes; não compartilhar cadastros automaticamente.
6. Funcionar manualmente sem internet e sem login, com backup e restauração.
7. Integrar WhatsApp para receber o cliente com saudação e cardápio semanal com preços, coletar o pedido e enviá-lo ao APK para entrega.
8. Confirmado posteriormente: cada celular tem seu negócio e número de WhatsApp. Ainda não existe número de vendas cadastrado.
9. Guardar o processo no GitHub. O proprietário escolheu explicitamente `Whamude/PowerBI-DataScience`, pasta `marmita-facil`.

## Primeira entrega: 1.0

App Android nativo em Java, SDK mínimo 23 (Android 6.0), sem bibliotecas externas de execução. Interface em português, SQLite local e preços em centavos inteiros.

Foram entregues cadastros, pedidos com vários itens, cálculo automático, datas, filtros, arquivamento, status coloridos e backup JSON. Os registros começam vazios e pertencem à instalação. Mudanças de preços não alteram pedidos antigos.

O APK foi compilado com ferramentas oficiais do Android e JDK 17, alinhado e assinado. Passaram 88 verificações de regras e validação, mais verificações da estrutura do APK e assinatura. O código está preservado em `historico/v1.0/android/`.

## Segunda entrega: 1.1 e integração WhatsApp

O desenvolvimento foi coordenado em frentes separadas: serviço de atendimento, importação Android e revisão de integração. O resultado usa a API oficial da Meta e um serviço separado por negócio. Não foram usados leitores de notificações, automação de WhatsApp Web ou acesso às conversas pessoais.

### Serviço do negócio

Webhook com verificação de assinatura, identificação do número de destino, fila SQLite persistente, sessão de atendimento e fila de respostas. O serviço não envia mensagens ao ser importado nem com envio desativado. O operador deve configurar as credenciais e habilitar explicitamente os envios.

O cliente recebe o cardápio publicado por dia e preço, escolhe data, opções e quantidades, informa nome, endereço e observações e revisa o total. Somente CONFIRMAR cria o pedido. MENU/RECOMEÇAR reiniciam, CANCELAR descarta rascunho e ATENDENTE pausa o bot e informa o contato humano real configurado.

O cardápio usa semana de segunda a domingo, disponibilidade por dia e revisão de preços. Alterações durante uma conversa exigem nova seleção. Há pausa de novos pedidos e respeito à janela de atendimento das mensagens. Áudio, imagens e linguagem livre não são convertidos em pedidos.

### APK

Nova aba WhatsApp com teste de conexão, saudação, publicação do cardápio semanal, dias de venda e pausa. A chave do aplicativo fica protegida por Android Keystore; a credencial Meta permanece no servidor.

Pedidos são importados em transação e identificados pela origem/número/ID externo. A confirmação de recebimento ao serviço só ocorre após gravação local. Sem rede, o pedido aguarda no servidor. Há busca em primeiro plano e JobScheduler em segundo plano, sem promessa de recebimento instantâneo.

SQLite v2 preserva registros v1 e acrescenta marcadores de importação. Backup v2 preserva deduplicação; arquivos v1 continuam aceitos. Restaurar substitui dados e desconecta a integração para reconectar o negócio correto.

## Revisão e correções

- Editar quantidade ou observações preserva o endereço/nome/telefone confirmados quando o cliente não foi trocado.
- Nova conversa após 24 horas recebe nova saudação/cardápio; pausa explícita de atendimento humano permanece até reinício solicitado.
- Servidor e Android usam os mesmos limites em unidades UTF-16, evitando pedido confirmado que o APK rejeitaria por tamanho de texto.
- Respostas são divididas em blocos compatíveis com o limite de mensagens; respostas antigas não são reativadas por nova conversa.
- Importação usa lotes limitados, exige o identificador do número e trata mudanças de conexão/cancelamento de tarefas.
- As APIs usadas na integração foram ajustadas para manter compatibilidade com Android 6.0.

## Testes e resultados da versão 1.1

129 verificações de regras/cardápio/contrato, 52 adicionais de protocolo/importação, teste de migração/constraints/rollback SQLite e 34 testes do serviço passaram. Um pedido fictício gerado pelo diálogo do servidor foi validado pelo contrato Java do APK. O teste HTTP local percorreu webhook assinado, processamento com transporte Meta falso, consulta de pedidos e confirmação de importação.

O APK 1.1 foi assinado com a mesma chave de 1.0, e foram verificados versão, permissões, DEX, assinatura v1/v2/v3 e alinhamento.

Nenhuma mensagem Meta real foi enviada. Nenhum número foi cadastrado, nenhuma hospedagem contratada e nenhum serviço implantado. Não houve teste em emulador ou aparelho físico. Os documentos de verificação registram esses limites.

## Orientação de ativação fornecida

Instalar o APK; criar o aplicativo Meta com o caso de uso WhatsApp; testar a comunicação da Meta; definir hospedagem HTTPS com armazenamento persistente; configurar as variáveis; executar servidor e worker; verificar `/webhook` e assinar `messages`; conectar o APK com URL/chave do negócio; publicar cardápio; habilitar envios; testar um pedido completo; depois cadastrar e validar o número definitivo.

As exigências de conta, revisão, permissões, coexistência e cobrança devem ser verificadas na conta Meta real. Documentação oficial: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started/ . Este registro resume o processo técnico e as decisões; não inclui senhas, dados de conta nem conteúdo de conversas privadas externas.
