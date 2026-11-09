# CT Prime — Código único de desconto da equipe

## Mudança
Todos os funcionários usam o **mesmo código** no carrinho do cardápio. O administrador não precisa cadastrar cada pessoa.

1. O percentual continua no painel **Configurações > Desconto de funcionários**.
2. O administrador clica em **Gerar código único**, copia e entrega somente aos funcionários.
3. O código aparece apenas no momento da geração. Pode ser substituído a qualquer momento, invalidando o anterior para todos, ou revogado.
4. No cardápio, o funcionário digita o código da equipe e clica em **Validar desconto**.
5. O servidor valida e recalcula o total, Pix, pedido e caixa. Clientes sem código pagam normalmente.

**Atenção:** quem souber o código conseguirá obter o desconto. Não publique em redes sociais ou no cardápio aberto ao público.

Os cadastros antigos de códigos individuais deixam de dar desconto, mas não são removidos do banco. O percentual atual continua como está. A instalação cria uma nova coluna sem excluir pedidos ou produtos.

## Atualizar o computador da academia (sem instalar Git)

**Feche o caixa/termine os pedidos antes de confirmar a instalação.** O processo para temporariamente o serviço PM2 e o religa. O instalador mescla a atualização com os arquivos locais, interrompendo se houver conflito, e faz backup antes de aplicar.

CMD como administrador:

```cmd
curl.exe -fL "https://raw.githubusercontent.com/suyane09/CTPRIME/main/atualizar-codigo-equipe-local.ps1" -o "%TEMP%\atualizar-codigo-equipe-local.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\atualizar-codigo-equipe-local.ps1"
```

O instalador usa como base a versão do CT Prime **antes dessa mudança**. Se houver conflitos na mescla, para **sem substituir arquivos**. Se conseguir preparar tudo, solicita confirmação `ATUALIZAR` antes de parar o serviço e executar backup.

Após a instalação, acesse `http://localhost:3000/index.html`, entre como admin, vá a Configurações, gere o código e teste o carrinho em `http://192.168.4.200:3000/cardapio.html`.

O acesso segue local pela mesma rede Wi-Fi, inclusive sem internet externa quando a rede interna permanece ativa.
