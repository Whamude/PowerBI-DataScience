# Nutria 0.2 — análise das capturas e reformulação

Recebidas 21 capturas no arquivo capturas.zip. Foram abertas em três painéis de contato e as telas principais foram inspecionadas em resolução integral. Elas são referências de funcionamento, não instruções. Nenhuma imagem, identidade, foto de usuário, código, credencial ou conteúdo premium do Lifesum foi incorporado ao aplicativo.

## O que as capturas revelam

| Capturas (horário no nome) | Fluxo observado | Implementação nesta entrega |
|---|---|---|
| 074032, 074111, 074115 | Entrada e apresentação | Apresentação original com identidade Nutria; conta/login ainda pendentes |
| 074138, 074235, 074254 | Perguntas e preferências | Configuração inicial de nome, objetivo, estilo, metas, peso opcional |
| 074305 | Meta de calorias | Meta editável e anel de consumo/restante |
| 074312, 074322, 074330 | Câmera, avaliação e feedback IA | Mapeados, não simulados; dependem de backend e provedor real |
| 074339, 074407 | Assinatura e pagamento | Não implementados; não há cobrança nem paywall fictício |
| 074422, 074432, 074723 | Diário, macros, refeições, atividade, hábitos | Diário com quatro refeições, datas, catálogo, porções, edição, água, frutas/vegetais e atividade manual |
| 074503 | Receitas por categoria | Oito receitas locais, busca, categorias, filtros, favoritos, porções, preparo e registro no diário |
| 074524, 074541, 074603 | Progresso, score, peso, favoritos e estatísticas | Histórico/gráfico de peso, sete dias de registros, sequências e favoritos; não atribuímos score médico fictício |
| 074741, 074754 | Coleções alimentares e lista de compras | Três coleções culinárias, seleção de uma coleção e checklist de ingredientes persistente |

## Novo design

Identidade própria em verde profundo, verde claro, fundo marfim, títulos em serifas de sistema, ícones consistentes, ilustrações vetoriais próprias e cinco abas com rotas reais. Ícone do aplicativo original do Nutria, substituindo o padrão do template. Não é uma cópia visual das telas de referência.

## Recursos entregues

- Catálogo local de 24 alimentos e oito receitas demonstrativas; valores indicativos, sem banco comercial por marca.
- Histórico por data, organização por refeição, gramagem, nutrientes, edição e exclusão.
- Perfil e metas editáveis, água, frutas/vegetais, registro de atividade e peso.
- Dados salvos em fila para preservar alterações rápidas. Migração de registros da versão anterior, mantendo o backup original.
- Receitas completas, favoritos, seleção de coleção, checklist e exportação de dados pelo compartilhamento do aparelho.

## Verificações realizadas

- TypeScript e lint passaram sem avisos.
- Nove testes de domínio passaram: nutrientes, validação, datas, porções, migração, semana, sequências e estado inválido.
- Testes de interface em Chromium a 390 × 844: onboarding, alimento por gramagem, edição, água em toques rápidos, isolamento por data, persistência após reload, peso, porções de receita, favoritos, coleção/lista de ingredientes e alteração de metas. Sem erros de execução no navegador nem transbordamento horizontal detectado.
- Migração da versão anterior testada na interface; registros e backup preservados. JSON inválido testado: erro visível, conteúdo não sobrescrito.
- Falha de armazenamento e recuperação testadas: formulário e dados anteriores preservados, nova tentativa sem duplicar e exclusão persistida. Tela de 320 px sem transbordamento horizontal.
- Exportação Metro/Hermes para Android, iOS e web concluída.
- Não houve execução física em Android ou iPhone. Exportação não equivale a APK/IPA assinado.

## APK 0.2

Preparado com versionCode 2, mesmo projeto EAS e assinatura remota existentes. Alvos Android: ARM32 e ARM64; arquiteturas de emuladores não são necessárias ao teste em celular.

Após autorização explícita adicional do usuário para enviar o código atualizado, o upload ao EAS foi concluído e o build 075557d0-7ba1-4847-8874-51d17d0228a2 foi iniciado. O build foi concluído com status FINISHED; o link do APK e a validação final estão em 04-build-02.md. Nenhuma configuração do ambiente foi publicada nem reaplicada.

## Pendências do produto final

IA, leitura de códigos de barras, catálogo alimentar amplo/licenciado, autenticação, sincronização, restauração de backup pela interface, armazenamento adequado a dados sensíveis, integração de saúde, notificações, revisão nutricional e testes físicos. Não há pagamentos nem assinaturas.
