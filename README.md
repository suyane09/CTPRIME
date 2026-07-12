# CT Prime API

API REST real (Node.js + Express + SQLite) para o sistema CT Prime, com autenticação JWT, controle de acesso por papel (RBAC) e atualizações em tempo real via Socket.IO. Substitui completamente o antigo armazenamento em `localStorage` do painel administrativo (`index.html`) e do cardápio do cliente (`cardapio.html`).

## O que mudou em relação à versão anterior

- **Antes:** os dados ficavam só no navegador (`localStorage`), sem senha real, sem persistência de verdade e sem funcionar em dispositivos diferentes.
- **Agora:** os dados ficam num banco SQLite no servidor, as senhas são criptografadas (bcrypt), o login gera um token JWT de verdade, e qualquer computador/celular na mesma rede pode acessar o painel e o cardápio ao mesmo tempo — inclusive com atualização instantânea (Socket.IO) quando um pedido novo chega ou um produto é alterado.

## Requisitos

- Node.js 18 ou superior (testado com Node 22)

## Como rodar

```bash
cd ctprime-api
npm install
npm start
```

O servidor sobe em `http://localhost:3000` e já serve os dois arquivos front-end:

- Painel administrativo: `http://localhost:3000/index.html`
- Cardápio do cliente: `http://localhost:3000/cardapio.html`

Na primeira execução, o banco `data/ctprime.db` é criado automaticamente com 3 usuários de teste (senha `123456` para todos):

| E-mail                | Papel      | Acesso                                  |
|------------------------|------------|------------------------------------------|
| admin@ctprime.com      | admin      | Total (relatórios, usuários, config)      |
| func@ctprime.com       | gerente    | Operações (pedidos, produtos, estoque)    |
| cozinha@ctprime.com    | cozinha    | Apenas fila de pedidos da cozinha         |

**Troque essas senhas em produção.**

## Variáveis de ambiente (`.env`)

```
PORT=3000
JWT_SECRET=troque_isso_por_um_segredo_forte_em_producao
JWT_EXPIRES_IN=8h
```

## Estrutura do projeto

```
ctprime-api/
├── server.js              # Servidor Express + Socket.IO + arquivos estáticos
├── db.js                  # Conexão SQLite, criação de tabelas e seed inicial
├── middleware/
│   └── auth.js            # Verificação de JWT e controle de papéis (RBAC)
├── routes/
│   ├── auth.js             # POST /api/auth/login · GET /api/auth/me
│   ├── produtos.js         # CRUD de produtos do cardápio
│   ├── estoque.js          # CRUD de itens de estoque
│   ├── pedidos.js          # Criação pública + gestão de status dos pedidos
│   ├── usuarios.js         # CRUD de usuários (admin)
│   ├── relatorios.js       # Resumos de vendas salvos (admin)
│   └── configuracoes.js    # Dados da loja (nome, CNPJ, telefone, e-mail)
├── data/
│   └── ctprime.db          # Banco SQLite (criado automaticamente)
└── public/
    ├── index.html          # Painel administrativo (consome a API)
    └── cardapio.html        # Cardápio do cliente (consome a API)
```

## Autenticação

Toda rota protegida espera o cabeçalho:

```
Authorization: Bearer <token>
```

O token é obtido em `POST /api/auth/login` e expira em 8 horas (configurável).

## Endpoints da API

### Autenticação
| Método | Rota              | Acesso   | Descrição                        |
|--------|-------------------|----------|-----------------------------------|
| POST   | /api/auth/login   | Público  | `{ email, senha }` → `{ token, usuario }` |
| GET    | /api/auth/me      | Logado   | Dados do usuário autenticado      |

### Produtos
| Método | Rota                | Acesso            | Descrição               |
|--------|----------------------|-------------------|---------------------------|
| GET    | /api/produtos        | Público           | Lista todos os produtos   |
| POST   | /api/produtos        | admin, gerente    | Cria produto               |
| PATCH  | /api/produtos/:id    | admin, gerente    | Edita/ativa/desativa       |
| DELETE | /api/produtos/:id    | admin, gerente    | Remove produto             |

### Estoque
| Método | Rota               | Acesso            |
|--------|--------------------|-------------------|
| GET    | /api/estoque       | admin, gerente    |
| POST   | /api/estoque       | admin, gerente    |
| DELETE | /api/estoque/:id   | admin, gerente    |

### Pedidos
| Método | Rota                      | Acesso                     | Descrição                                   |
|--------|----------------------------|-----------------------------|-----------------------------------------------|
| POST   | /api/pedidos               | Público (cardápio)          | Cliente envia um novo pedido                  |
| GET    | /api/pedidos               | Qualquer usuário logado     | Lista todos os pedidos                        |
| PATCH  | /api/pedidos/:id/status    | gerente, cozinha (regras*)  | Avança o status do pedido                     |
| DELETE | /api/pedidos/:id           | admin, gerente              | Remove um pedido                              |

\* Regras de transição de status: administradores só visualizam (não operam a fila); a cozinha aceita pedidos e os move entre "preparando"/"pronto"; só o gerente pode recusar um pedido ou marcá-lo como "entregue".

### Usuários (somente admin)
| Método | Rota               |
|--------|--------------------|
| GET    | /api/usuarios      |
| POST   | /api/usuarios      |
| PATCH  | /api/usuarios/:id  |
| DELETE | /api/usuarios/:id  |

Novos usuários são criados com a senha padrão `123456`.

### Relatórios (somente admin)
| Método | Rota                  |
|--------|------------------------|
| GET    | /api/relatorios        |
| POST   | /api/relatorios        |
| DELETE | /api/relatorios/:id    |

### Configurações da loja
| Método | Rota                  | Acesso   |
|--------|------------------------|----------|
| GET    | /api/configuracoes     | Público  |
| PUT    | /api/configuracoes     | admin    |

## Tempo real (Socket.IO)

O servidor emite estes eventos para todos os clientes conectados assim que algo muda no banco:

- `pedido:novo`, `pedido:atualizado`, `pedido:removido`
- `produtos:atualizado`
- `estoque:atualizado`
- `configuracoes:atualizada`

O painel administrativo e o cardápio já escutam esses eventos e se atualizam sozinhos — não é mais necessário que as duas páginas estejam na mesma aba/origem do navegador como no esquema antigo de `localStorage`.

## Colocando em produção

- Troque `JWT_SECRET` por um valor aleatório forte.
- Rode atrás de um proxy HTTPS (nginx, Caddy, etc.) — hoje o servidor está em HTTP puro.
- Troque as senhas padrão (`123456`) de todos os usuários assim que possível.
- O arquivo `data/ctprime.db` é o seu banco de dados — faça backup dele periodicamente.
- Para rodar como serviço permanente, use `pm2 start server.js --name ctprime-api` ou um serviço systemd.
