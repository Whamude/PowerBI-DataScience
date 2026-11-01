# Validação atual — preparação Nutria 0.4

TypeScript e lint passaram. Dezenove testes de domínio/integridade/criptografia passaram. Testes do gerador: criação e backup de chave protegida, senha errada, desbloqueio, assinatura, e-mail e prazo, sem requisições externas. Testes de ativação: bloqueio de link direto, e-mail incorreto, expiração, migração consentida, isolamento de contas, saída e renovação. O fluxo de refeições/receitas/metas/persistência após ativação também passou no navegador móvel.

Exportação Metro/Hermes concluída para Android, iOS e web. Não foi compilado APK 0.4: falta a chave pública real do proprietário. O padrão de distribuição está sem chave pública e não libera acesso. Nenhuma chave privada de produção foi criada nesta máquina ou incluída no projeto.

O APK de produção anterior é 0.3, documentado em 06-build-03.md. Continua sem a ativação exigida na nova preparação. Não houve teste físico de ativação em aparelho.
