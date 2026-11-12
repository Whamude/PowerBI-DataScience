# Recuperação das fotografias das receitas

Nutria 0.7.2 Android versionCode 9 preserva a base local 0.7.1 com visitante e cadastro ao salvar evolução, além de Português e English, ativação e prazo de 168 horas.

A importação de quatro páginas selecionou um fundo gráfico compartilhado em lugar da fotografia. Recuperadas do PDF original fornecido pelo proprietário as fotografias das páginas 29, 43, 77 e 89, para iridium-22, iridium-34, iridium-64 e iridium-74. As fotos são ilustrações originais do ebook; não comprovam uma preparação exata de todos os ingredientes. Nenhuma fotografia externa foi incorporada e nenhuma nova autorização comercial foi obtida nesta correção.

As outras 93 imagens permanecem byte a byte iguais à versão local anterior. Mantidos nomes de arquivo, IDs, ingredientes, preparo, traduções, favoritos, namespaces de dados e chave pública de produção. A conversão de CMYK para RGB permite exibição PNG no aplicativo.

Os hashes e a origem das quatro fotos estão em 14-recuperacao-fotos.json. O teste de regressão rejeita o hash do fundo gráfico em qualquer receita e exige quatro fotos diferentes. A suíte existente verifica o hash real de todos os arquivos.

Pagamento e envio automático de códigos continuam adiados. A publicação nas lojas e o teste em aparelho físico não fazem parte da validação local.
