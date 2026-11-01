# Nutria — backup para continuar em outra conta

Estado: APK mais recente 0.4.0 (versionCode 4), compilado com sucesso no Expo/EAS, com ativação offline por e-mail e chave pública real `cfae2c592dc713e9`. Build e download em docs/08-build-04.md. O APK 0.3 foi preservado como versão anterior. Aplicativo Android/iOS em Expo SDK 58. O APK Android foi compilado com sucesso no Expo/EAS. iOS foi exportado, mas não foi gerado IPA.

## Ponto de retomada — 1 de novembro de 2026

- Trabalhar somente no Nutria, em `/workspace/PowerBI-DataScience/Nutria`. Os materiais de Power BI, R e CNTK ficam fora do escopo. Usar o checkout existente, sem criar worktrees para iniciar.
- APK 0.4 concluído no build EAS `bffa060e-89fe-4cd1-a762-f92f2b8e8946`; link e expiração em `docs/08-build-04.md`. Não iniciar outra compilação sem necessidade.
- O usuário recebeu o link de download e as instruções de instalação sobre a versão anterior, sem desinstalar. Ainda não confirmou instalação, ativação ou teste físico no celular.
- Próximo passo: obter o resultado do teste no aparelho, conferir a ativação com o código emitido pelo proprietário e, se houver dados da 0.3, a associação consentida e preservação desses registros. Corrigir problemas concretos que forem encontrados antes de ampliar funcionalidades.
- Lint, tipos, 19 testes e os testes de navegador de ativação e fluxos passaram após a declaração de expo-font; Expo Doctor passou nas 20 verificações no servidor EAS.
- O token Expo foi configurado no ambiente e o acesso à equipe whamudes-team foi validado. Nunca gravar o token no repositório ou pedir seu valor no chat. A chave privada de emissão e sua senha permanecem somente com o proprietário.
- O ambiente foi publicado pelo usuário. Não reaplicar configurações anteriores nem publicar o ambiente automaticamente. Há somente uma nova liberação de rede salva em rascunho para `wf-artifacts.eascdn.net`, necessária para baixar e inspecionar APKs localmente; ela não foi publicada. O APK foi compilado no EAS, mas a inspeção local do arquivo ficou bloqueada por esse domínio.
- Este registro preserva o estado técnico e as decisões para continuidade; a conversa completa não é transcrita automaticamente para o Git.

## Para baixar e transferir

O arquivo backup/Nutria-0.4-preparacao.zip é uma cópia histórica anterior à configuração da chave pública real e à correção de expo-font; ele não representa o código completo do APK 0.4 atual. O backup da versão anterior continua em backup/Nutria-0.3-projeto.zip. Para continuar o desenvolvimento atual, use este checkout e o registro em docs/08-build-04.md. Os arquivos ZIP históricos contêm código, imagens, documentação e testes, sem node_modules ou credenciais.

Prompt sugerido:

> Continue o desenvolvimento do Nutria a partir deste projeto. Leia COMECAR-AQUI.md, README.md, AGENTS.md e docs. Preserve os identificadores Expo/Android/iOS, a assinatura Android e os registros locais. A versão atual é 0.4.0, com chave pública configurada para ativação individual por e-mail e APK compilado no EAS; a versão anterior é 0.3. Há 105 receitas, incluindo 97 receitas e imagens dos PDFs fornecidos. Verifique as pendências documentadas antes de prometer recursos prontos.

## Linha do tempo e decisões

1. A conversa começou com onboarding de Whamude/PowerBI-DataScience. Esse repositório é material de curso; Power BI Desktop requer Windows. A instalação inicial de R ficou limitada por permissões. O Nutria foi criado depois em projeto separado.
2. O usuário forneceu o Lifesum 20.12.0 como referência. O XAPK excedia 32 MiB. Partes DEX/recursos foram enviadas separadamente e analisadas estaticamente. Código, chaves, imagens e serviços privados do Lifesum não foram reutilizados.
3. Primeiro APK básico foi considerado inferior à referência. O usuário forneceu 21 capturas, que orientaram a reformulação 0.2. O mapa de telas e decisões está em docs/03-capturas-e-reformulacao.md.
4. A versão 0.2 ganhou cinco áreas: Diário, Evolução, Planos, Receitas e Perfil; dados locais, refeições por data, porções, edição, água, atividades, peso, favoritos e exportação.
5. Dois PDFs enviados inicialmente foram retirados a pedido do usuário. Não reutilizar o e-book antigo chamado almoço e jantar.pdf (Nutritotal/GANEP).
6. PDFs corretos: CAFÉ DA MANHÃ.pdf (20 receitas) e 77-receitas-fitness-iridium-labs.pdf (77 receitas). A extração gerou 97 receitas e imagens, com origem, página e hashes. Esses dados estão em src/data/imported-recipes.json; imagens em assets/recipes.
7. A versão 0.3 incorporou as 97 receitas aos oito exemplos anteriores, totalizando 105. Lista virtualizada, fotos offline, busca por ingrediente/sem acentos, categorias e favoritos.
8. Valores nutricionais ausentes não são inventados. Os 24 quadros dos PDFs são transcritos sem supor base por porção. Para registrar receitas importadas no diário, o usuário informa a porção consumida e seus nutrientes. A ambiguidade “21 scoop” em cafe-10 está sinalizada.

9. O usuário pediu código de ativação individual por e-mail. A preparação 0.4 inclui gerador offline tools/gerador-ativacao.html, assinatura Ed25519, chave privada protegida no computador do proprietário, chave pública fixada no APK, rotas protegidas e dados separados por e-mail. Não há servidor obrigatório nem senha mestra. docs/07-ativacao-email.md documenta os limites.
10. O proprietário forneceu somente sua chave pública, identificador cfae2c592dc713e9, que já foi configurada no código. A chave privada permanece com ele. O gerador está em tools/Nutria-Gerador-Ativacao.zip. Nunca pedir a chave privada ou sua senha no chat. Não distribuir APK com a chave de testes. O APK 0.4 foi compilado com a chave pública real; consulte docs/08-build-04.md.

## Infraestrutura e builds

- Projeto Expo: @whamudes-team/Nutria.
- Project ID: 3fcedfe1-f754-4191-be79-eb7350492f26.
- Android/iOS identifier: app.nutria.mobile.
- A chave Android é gerenciada no Expo. Preservar a mesma chave para atualizar instalações existentes.
- Novo ambiente precisa de autenticação Expo própria e acesso à rede. Nunca colocar EXPO_TOKEN no chat, código ou Git.
- Domínios usados: api.expo.dev, expo.dev, docs.expo.dev, storage.googleapis.com; além dos registros de pacotes.
- Perfil EAS preview gera APK autônomo ARM32/ARM64; production gera AAB. Não enviar para lojas sem instrução do usuário.
- O usuário autorizou compilações no Expo/EAS. Uma nova conta/contexto deve verificar seu próprio acesso e autorizações.

## Validação e limites

TypeScript, lint, 19 testes de domínio/integridade/criptografia e os testes novos de ativação e gerador passaram. A 0.4 foi exportada para Android/iOS/web; o APK 0.4 foi compilado no EAS com a chave pública real. As compilações Android 0.3 e 0.4 foram concluídas. A dependência expo-font foi declarada diretamente com o config plugin, e o Expo Doctor do build 0.4 passou nas 20 verificações. Não afirmar validação física independente em aparelhos. IA, scanner, autenticação, sincronização, saúde e pagamentos continuam pendentes. Dados locais não têm criptografia própria nem backup automático.

Este documento resume a continuidade técnica e decisões; não é uma transcrição integral da conversa. O histórico completo deve ser exportado separadamente pela conta de origem.
