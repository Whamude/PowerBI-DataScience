# Android: visitante e cadastro ao salvar

Pedido do proprietário em 05/11/2026: novo usuário deve explorar sem cadastro; pedir cadastro somente para comprar ou salvar sua evolução, com uma janela agradável e mensagem simpática.

## Comportamento implementado

- Após escolher o idioma, instalação nova entra como visitante, sem solicitar nome ou e-mail nem exigir o preenchimento do perfil inicial.
- Visitante pode navegar pelas cinco abas, receitas e coleções. Preferências temporárias permanecem somente em memória. Nenhum histórico de evolução é salvo sem cadastro.
- O controle central de gravação intercepta mudanças de diário, refeições, água, hábitos, atividades e pesos. Mostra uma janela com Criar cadastro / Agora não. Cancelar mantém o formulário e a navegação.
- Cadastro pede nome e e-mail válido. Concluí-lo salva também o registro que originou o pedido. Históricos locais existentes do mesmo e-mail são mantidos e recebem apenas a alteração solicitada.
- Comprar ou ativar acesso, no Perfil, pede cadastro ao visitante antes de mostrar a ativação por código existente. Não há checkout de pagamento novo ou fictício nesta mudança.
- Cadastro é local, sem senha, confirmação remota de e-mail, sincronização ou backup na nuvem. A interface informa esse limite. Não apresentar como autenticação de servidor.

## Compatibilidade e prazo

Mantidas as chaves nutria.trial.v1, nutria.activation.v1 e nutria:account:<hash>:v2. Novos testes anônimos usam registro de versão interna 2 com e-mail null; usuários antigos de teste continuam em versão 1. O cadastro converte o teste anônimo para versão 1, mantendo startedAt, lastSeenAt, ended e o vencimento original de 168 horas. Não há outro teste, renovação ou liberação por cadastrar. Licenças continuam verificadas pela chave pública original, sem alteração.

O namespace interno do visitante não é gravado no armazenamento de dados. Contas, históricos e dados antigos permanecem separados por e-mail. Metadados inválidos ou testes expirados não criam outro prazo. Atualizar o app preserva o início existente.

## Verificação

32 testes unitários, duas auditorias de tradução, lint e typecheck aprovados. Regressão Chrome/Windows aprovada: entrada sem cadastro, navegação, cancelamento, e-mail inválido, cadastro com peso salvo, reabertura, compra exigindo cadastro, históricos preexistentes e bloqueio após vencer. A verificação de navegador não substitui teste físico Android.

Código Android em work/nutria-bilingual/Nutria. Base entregue: 0.7.0, versionCode 7, PR #3, commit 20b994f01ab44770fc96cce5b58b2460f6d75ca5. O checkout local mantém a base histórica e as alterações bilíngues não commitadas já existentes; não descartar o diff. Backup anterior à mudança em C:/Users/Administrador/Documents/Codex/2026-11-05/re/work/Nutria-Android-antes-visitante.zip.

Nenhum novo APK ou build EAS solicitado nesta mudança. A versão do pacote não foi incrementada. Ao gerar a próxima entrega, incrementar versão/versionCode, preservar assinatura e conferir o APK antes de entregá-lo como atualizado. APK 0.7.0 já entregue permanece intacto.

## iPhone pausado

Não aplicar esta mudança no checkout iOS sem pedido do proprietário. Checkpoint completo em C:/Users/Administrador/Documents/Codex/2026-11-05/re/outputs/Nutria-iPhone-checkpoint-2026-11-05.zip. Build de simulador e84afbcd-5e31-4e8c-9eae-5935d38a35bf concluído e artefato verificado. Teste nativo pendente; proprietário possui apenas iPhone. Instalação pelo EAS depende de Apple Developer e provisionamento. Não duplicar build, comprar inscrição, publicar ou enviar ao TestFlight automaticamente.

## Compilação Android autorizada

Após o pedido de continuar, foi solicitada uma única compilação preview APK: d4d6828d-33d8-4e01-bc85-1d10ab387d6b. Nutria 0.7.1, Android versionCode 8, mesmo pacote app.nutria.mobile. Credenciais remotas existentes reutilizadas com freeze-credentials. Perfil preview sem variáveis de ambiente públicas/sensíveis no Expo; nenhuma chave de testes fornecida. Snapshot local em outputs/Nutria-0.7.1-codigo.zip no workspace de 05/11/re; manifesto SHA-256 de fontes em work/Nutria-0.7.1-source-manifest.json. Testes, lint e typecheck aprovados. Estado inicial NEW; acompanhar este ID, não duplicar solicitação. Download, verificação do APK e teste físico permanecem pendentes até atualização deste registro.

## Ponto de retomada: aguardando fila do Expo

Último estado confirmado do build d4d6828d-33d8-4e01-bc85-1d10ab387d6b: IN_QUEUE, sem previsão informada. Arquivos enviados e credenciais remotas aceitas; nenhum APK 0.7.1 disponível ainda. O acompanhamento local foi encerrado após consultas repetidas sem mudança; a solicitação remota não foi cancelada. Ao retomar, consultar este mesmo ID, sem iniciar outro build. Se FINISHED, executar work/download-guest-apk.mjs e work/verify-guest-apk.py a partir de C:/Users/Administrador/Documents/Codex/2026-11-05/re, após atualizar work/Nutria-0.7.1-build-status.json pela CLI EAS. Esses auxiliares estão preparados; só entregar o APK depois de confirmar pacote app.nutria.mobile, versão 0.7.1/code 8, presença da janela no bundle e mesmo certificado da versão 0.7.0. Teste físico Android continua pendente. Não afirmar que a compilação terminou antes dessa conferência.
