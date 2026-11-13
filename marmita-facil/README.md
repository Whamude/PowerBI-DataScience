# Marmita Fácil

Aplicativo Android para gerenciar vendas de marmitas e integração opcional com WhatsApp Cloud API.

**Estado em 13/11/2026:** versões 1.0 e 1.1 compiladas e assinadas. O atendimento foi validado com mensagens simuladas. A integração ainda não está ativa em um número real: faltam número de vendas, configuração Meta e hospedagem HTTPS. Instalação e interface ainda não foram testadas em aparelho físico ou emulador.

## Comece aqui

- [Instalador Android 1.1](releases/MarmitaFacil-1.1.apk)
- [Passo a passo de instalação e ativação](docs/ativacao-whatsapp.txt)
- [Histórico do processo e decisões](docs/PROCESSO.md)
- [Pendências e critérios de ativação](docs/STATUS.md)
- [Guia técnico do serviço](whatsapp-service/README.txt)
- [Guia de compilação Android](android/LEIA-ME.txt)

## O que foi implementado

- Clientes, telefone e endereço; cadastro e arquivamento de tipos de marmita e preços.
- Pedidos com vários tipos, quantidades, dia do pedido, entrega, valor unitário e total calculado.
- Status com texto e cores: A entregar (âmbar), Entregue (verde), Cancelado (vermelho).
- Busca, filtros e backup/restauração. Controle manual disponível sem internet.
- Uso independente: cada celular/negócio tem seus registros, número e serviço próprios.
- WhatsApp opcional: boas-vindas, cardápio por dia da semana, coleta guiada, resumo e confirmação explícita antes de registrar.
- Importação de pedidos com persistência, deduplicação, migração SQLite v1→v2 e preservação dos dados confirmados.

## Organização

| Pasta | Conteúdo |
|---|---|
| `android/` | Código atual, projeto Gradle, compilação direta e testes Android/JVM |
| `whatsapp-service/` | Serviço Python, exemplo de configuração sem segredos e testes do atendimento |
| `releases/` | APKs assinados das versões 1.0 e 1.1 |
| `historico/v1.0/android/` | Código da primeira versão offline |
| `docs/` | Requisitos, decisões, revisões, ativação, testes e pendências |

## Fluxo de atendimento

```mermaid
flowchart LR
    A[Cliente no WhatsApp] --> B[Webhook oficial da Meta]
    B --> C[Serviço do negócio e fila SQLite]
    C --> D[Saudação e cardápio semanal]
    D --> E[Data, itens, quantidades e endereço]
    E --> F[Resumo e confirmação do cliente]
    F --> G[Pedido persistido no serviço]
    G --> H[Importação no APK]
    H --> I[A entregar]
```

Com o app aberto, a busca ocorre a cada minuto. Em segundo plano, o Android agenda buscas com intervalo mínimo de 15 minutos e pode adiá-las. Não há garantia de recebimento instantâneo com o app fechado.

## Validação registrada

- 129 verificações das regras, cardápio e contrato Android/servidor.
- 52 verificações adicionais do protocolo/importação.
- Teste do esquema e da migração com SQLite real no computador.
- 34 testes do serviço, incluindo HTTP local completo com transporte Meta simulado.
- Assinaturas APK v1/v2/v3, alinhamento e identidade de assinatura entre 1.0 e 1.1 verificados.

São testes de computador e mensagens simuladas. Cadastro Meta, implantação, instalação Android, Keystore, agendamento real e pedido de ponta a ponta com WhatsApp real continuam pendentes.

## Chaves e configuração

Este repositório público não contém a chave privada de assinatura, suas credenciais, tokens reais, bancos de clientes nem os ZIPs privados originais que incluem essa chave. O backup privado original foi entregue separadamente e deve ser guardado pelo proprietário.

Para atualizar os APKs já instalados, recupere a chave original no ambiente local antes de compilar a versão de produção. Uma nova chave não atualiza as instalações assinadas com a anterior. O projeto público permite compilar uma instalação de desenvolvimento ou usar uma chave fornecida privadamente.

Use `whatsapp-service/.env.example` como referência. Configure valores reais no ambiente do servidor. O serviço não carrega `.env` automaticamente. O token da Meta nunca deve ser colocado no APK. Os arquivos `MANIFESTO.json` e `SHA256SUMS.txt` registram os arquivos desta pasta.
