> Atualização 0.7: Português e English com preferência persistida, chave pública de produção configurada e teste experimental de 168 horas preservado. Leia primeiro README.md, docs/08-teste-experimental.md e docs/10-idiomas.md. As notas de preparação 0.4 abaixo são históricas.

# Nutria — backup para continuar em outra conta

Estado: APK de produção atual 0.3.0 (versionCode 3). Código preparado para 0.4.0 com ativação offline por e-mail, aguardando a chave pública real do proprietário. Aplicativo Android/iOS em Expo SDK 58. O APK Android foi compilado com sucesso no Expo/EAS. iOS foi exportado, mas não foi gerado IPA.

## Para baixar e transferir

O arquivo backup/Nutria-0.4-preparacao.zip contém o trabalho atual, ainda sem chave pública real para o novo APK. O backup da última versão publicada continua em backup/Nutria-0.3-projeto.zip. O arquivo de preparação contém o código, imagens, documentação e testes, sem node_modules ou credenciais. Baixe esse arquivo no GitHub e anexe na nova conversa GPT. Ele tem cerca de 20 MB.

Prompt sugerido:

> Continue o desenvolvimento do Nutria a partir deste projeto. Leia COMECAR-AQUI.md, README.md, AGENTS.md e docs. Preserve os identificadores Expo/Android/iOS, a assinatura Android e os registros locais. A versão preparada é 0.4.0, aguardando chave pública para ativação individual por e-mail; o último APK é 0.3. Há 105 receitas, incluindo 97 receitas e imagens dos PDFs fornecidos. Verifique as pendências documentadas antes de prometer recursos prontos.

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
10. Falta o proprietário gerar a chave em seu computador e enviar SOMENTE o arquivo da chave pública. O gerador está em tools/Nutria-Gerador-Ativacao.zip. Nunca pedir a chave privada ou sua senha no chat. Não distribuir APK com a chave de testes nem fingir que a 0.4 já está compilada.

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

TypeScript, lint, 19 testes de domínio/integridade/criptografia e os testes novos de ativação e gerador passaram. A 0.4 foi exportada para Android/iOS/web; o APK 0.4 ainda não foi compilado por falta da chave pública real. Compilação Android 0.3 concluída. Não afirmar validação física independente em aparelhos. IA, scanner, autenticação, sincronização, saúde e pagamentos continuam pendentes. Dados locais não têm criptografia própria nem backup automático.

Este documento resume a continuidade técnica e decisões; não é uma transcrição integral da conversa. O histórico completo deve ser exportado separadamente pela conta de origem.
