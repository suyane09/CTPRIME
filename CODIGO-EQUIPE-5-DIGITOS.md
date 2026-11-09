# CT Prime — código único de 5 números

O código da equipe agora é formado por **5 dígitos numéricos** (inclusive quando começa com zero, como `01234`). O desconto percentual configurado no sistema é preservado.

- O administrador acessa **Configurações > Código único de 5 números para a equipe**.
- Escolhe **Trocar código da equipe** para gerar um código novo.
- O código novo substitui e invalida imediatamente o anterior. Copie quando for gerado: depois ele não pode ser recuperado.
- Os funcionários digitam os cinco números no campo do carrinho e clicam em **Validar desconto**.
- O código é validado no servidor. O valor final continua sendo calculado usando os preços e o percentual do banco.
- O servidor aceita temporariamente códigos antigos de 16 caracteres **enquanto não forem substituídos**, para que a atualização não invalide de surpresa o código anterior.
- A validação de códigos incorretos tem limite por IP de dez tentativas a cada 15 minutos; validações bem-sucedidas não contam.
- Não colocar o código em locais públicos: por ser compartilhado, qualquer pessoa que o saiba poderá utilizá-lo.

## Atualização no PC da academia

O CT Prime roda em `C:\CTPRIME`, sem exigir Git. A aplicação deverá ficar sem pedidos em andamento durante a reinicialização temporária do serviço. O instalador confere e mescla arquivos locais, para em caso de conflito, e faz backup antes de alterar os arquivos.

Abra **CMD como administrador**:

```cmd
curl.exe -fL "https://raw.githubusercontent.com/suyane09/CTPRIME/main/atualizar-codigo-5digitos-local.ps1" -o "%TEMP%\atualizar-codigo-5digitos-local.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\atualizar-codigo-5digitos-local.ps1"
```

Após a verificação, o instalador pedirá `ATUALIZAR`. Digite só quando a cafeteria estiver sem pedidos em andamento. Não execute instaladores anteriores.

Depois, no painel administrativo, clique em **Trocar código da equipe** para gerar **um novo código de cinco números**. Teste o desconto no cardápio, o valor do Pix e o total do pedido.
