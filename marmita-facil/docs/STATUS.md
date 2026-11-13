# Estado e próximas etapas

Atualizado em 13/11/2026.

## Preparado e validado no computador

- [x] APK 1.0 offline e APK 1.1 com integração opcional.
- [x] Cadastro de clientes, tipos/preços, pedidos, total, entrega e status.
- [x] Backup/restauração, compatibilidade v1/v2 e migração SQLite.
- [x] Cardápio semanal por dia, saudação e controle de novos pedidos.
- [x] Atendimento guiado com confirmação e persistência de pedidos.
- [x] Autenticação, isolamento por negócio e proteção contra duplicação.
- [x] Testes automatizados, fluxo HTTP local simulado e assinaturas dos APKs.

## Pendente para operação real

- [ ] Obter o número de vendas de cada negócio.
- [ ] Concluir cadastro, permissões e configuração da Meta.
- [ ] Definir hospedagem com HTTPS e disco persistente por negócio.
- [ ] Configurar credenciais e contato de atendimento humano no servidor.
- [ ] Executar e monitorar servidor e worker.
- [ ] Verificar o webhook e habilitar os eventos de mensagens.
- [ ] Conectar o APK ao serviço e publicar o cardápio correto.
- [ ] Habilitar envios reais e executar pedido completo com telefone autorizado.
- [ ] Validar instalação/atualização em aparelho físico, Keystore, backup e agendamento Android.
- [ ] Validar cenário offline, retorno da rede, pausa, cancelamento e histórico.
- [ ] Configurar backups e operação do banco do servidor.

Não considerar a integração ativa até concluir essas etapas. Não existe recebimento instantâneo garantido com o APK fechado, interpretação automática de áudio ou pagamento automático. Alterar o status no APK não envia mensagem de acompanhamento ao cliente.
