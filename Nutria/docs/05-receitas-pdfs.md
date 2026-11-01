# Nutria 0.3 — receitas dos PDFs corrigidos

Integradas 97 receitas (20 de CAFÉ DA MANHÃ.pdf e 77 de 77-receitas-fitness-iridium-labs.pdf), preservando as oito receitas anteriores. Total: 105.

As 97 imagens são cópias diretas dos objetos extraídos dos PDFs, incluindo marcas d'água existentes. Os hashes em imported-recipes.json são verificados por teste. Os PDFs originais e os materiais anteriormente descartados não são incorporados ao aplicativo.

## Comportamento

- Fotos nos cartões e detalhes, disponíveis offline.
- Lista virtualizada para não renderizar as 105 fotos simultaneamente.
- Busca por título e ingredientes, ignorando acentos.
- Categorias múltiplas: café da manhã, almoço, jantar, lanche e sobremesa. A classificação por refeição é editorial; a fonte permanece indicada.
- Filtros para receitas dos PDFs e favoritos. Classificações vegetarianas/veganas só são usadas quando identificadas; as não classificadas continuam na lista geral.
- Autoria/documento/página, ingredientes, preparo e avisos de origem nos detalhes.
- Os 24 quadros nutricionais encontrados são transcritos, sem supor base por porção ou completar números ausentes. Receitas importadas não geram registros com calorias zero: exigem os nutrientes e a descrição da porção consumida informados pelo usuário.
- A receita cafe-10 preserva a ambiguidade “21 scoop” e apresenta um aviso de conferência.
- Receitas antigas mantêm seus IDs, porções e cálculo de nutrientes. Favoritos e diário existentes são preservados; o esquema local continua v2.

## Validação

TypeScript, lint e 13 testes de domínio/integridade passaram. Conferidos 97 arquivos de imagem e seus hashes, correspondência com os dois PDFs corrigidos, IDs únicos, conteúdo das receitas e filtros.

Teste de interface móvel passou: 105 receitas, busca sem acento, imagens carregadas, autoria, bloqueio de registro sem nutrientes, entrada manual, manutenção de registros e água, favoritos persistentes, almoço/jantar e tabela nutricional original sem aplicar valores automaticamente. Nenhum erro de execução ou transbordamento horizontal detectado no fluxo.

Exportação Metro/Hermes concluída para Android, iOS e web, incluindo os recursos locais. Testes físicos em aparelhos ainda não realizados. O resultado do build APK será registrado separadamente, quando concluído.
