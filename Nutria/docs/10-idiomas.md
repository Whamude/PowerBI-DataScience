# Nutria 0.7 — Português e English

O primeiro uso apresenta uma escolha acessível entre Português e English. A preferência fica em `nutria.language.v1` no AsyncStorage e pode ser alterada no Perfil ou na tela de ativação. A troca vale imediatamente para as telas abertas e é restaurada ao reabrir o app. Português usa `pt-BR`; English usa `en-US` para datas e números.

## Traduções e conteúdo

- `src/i18n/en.mjs` centraliza as mensagens da interface, acessibilidade, validações, catálogo de alimentos, receitas Nutria e coleções. As chaves são os textos canônicos em português. `core.mjs` trata interpolação, datas/números e erros de domínio sem modificar os valores persistidos.
- `src/i18n/recipes.en.json` contém nomes, ingredientes e preparo em inglês das 97 receitas importadas. As oito receitas Nutria também têm tradução. O material original, seus identificadores, categorias internas, fotos, hashes e atribuição permanecem em `src/data/`.
- As tabelas nutricionais da fonte são traduzidas e têm seus separadores numéricos adaptados, sem recalcular valores, atribuir uma base por porção ou preencher nutrientes ausentes. Ambiguidades da fonte são preservadas e sinalizadas. Nomes próprios, publicações e créditos não são renomeados.
- O app não possui notificações próprias nesta versão. Diálogos fornecidos pelo sistema operacional, como o compartilhamento, seguem o idioma do sistema; os títulos fornecidos pelo Nutria são traduzidos.

## Dados e ativação

O idioma é uma preferência deste aparelho, separada do e-mail de ativação. Alterá-lo não modifica `nutria.trial.v1`, `nutria.activation.v1`, o início do teste, as assinaturas, os dados por e-mail ou o backup legado. O teste continua sendo de 7 dias (168 horas) desde o início original. Registros já encerrados não são reabertos.

Filtros, favoritos, categorias, coleções e checklist mantêm chaves canônicas estáveis. Novas entradas vindas do catálogo e de receitas guardam referências opcionais à origem, permitindo traduzir seus nomes na exibição. A edição manual remove essas referências. Entradas antigas sem referência de origem e textos livres são preservados literalmente: não é seguro inferir se um nome antigo foi digitado pelo usuário. Descrições de porções, nomes pessoais e atividades digitadas não são traduzidos automaticamente.

## Verificação

Execute em `Nutria/`: `npm test`, `npm run lint` e `npm run typecheck`. A suíte inclui cobertura de placeholders, números, datas, receitas completas, textos fixos e continuidade do teste de 7 dias. A auditoria falha quando um texto literal da interface ou do catálogo não possui tradução central.

Com o servidor web de teste na porta 8082, Playwright disponível e uma chave pública descartável aplicada somente ao servidor de testes, execute `node tests/browser-language.cjs` e `node tests/browser-trial.cjs`. No Windows, `NUTRIA_CHROMIUM_EXECUTABLE` aponta para o Chrome/Chromium instalado; `NODE_PATH` pode apontar para as dependências de teste. O teste bilíngue cobre seleção inicial, persistência, cinco abas, validação, números, receitas, checklist, registros livres, ativação e dados preservados. Nunca usar a chave de testes no APK.

## APK

Versão 0.7.0, Android versionCode 7 e iOS buildNumber 7. O perfil EAS `preview` gera APK interno, com o mesmo pacote `app.nutria.mobile` e a assinatura Android existente. Instalar como atualização, sem desinstalar ou apagar dados. Compilar não substitui a validação física em aparelho.
