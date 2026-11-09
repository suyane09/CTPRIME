# Desconto de funcionários — CT Prime

## Funcionalidade

- O administrador acessa **Configurações > Desconto de funcionários — cafeteria**.
- Define um percentual inteiro de **0 a 90%**. Padrão: **0%**, desativado.
- Cadastra funcionários e recebe um **código individual aleatório** (exibido uma única vez).
- No cardápio, o funcionário digita seu código e clica em **Validar desconto**.
- Subtotal, desconto e valor final são exibidos antes de confirmar, incluindo Pix.
- O backend valida novamente o código, verifica se está ativo e **recalcula o total a partir dos preços do SQLite**, ignorando qualquer total enviado pelo navegador.
- Pedidos registram subtotal, desconto em reais, percentual aplicado e nome do funcionário. Caixa usa o total efetivamente cobrado. Relatórios de receita por produto usam valor líquido rateado.
- O administrador pode desativar, reativar e renovar códigos (o código anterior deixa de funcionar).
- O sistema continua **local** e sem dependência de serviços externos durante o uso.

## Instalador para a academia (CMD, como administrador)

**IMPORTANTE: somente quando o expediente terminar e não houver pedidos em andamento.**
Não executar `instalar-producao.bat` ou tentar instalar outro PM2.

O PC já usa `C:\CTPRIME`, `pm2.exe` como serviço automático e porta 3000.

1. No CMD elevado (Executar como administrador), baixar o instalador:

   ```cmd
   curl.exe -fL "https://raw.githubusercontent.com/suyane09/CTPRIME/feature/desconto-funcionarios-cafeteria/instalar-desconto-local.ps1" -o "%TEMP%\ctprime-instalar-desconto.ps1"
   ```

2. Conferir o script opcionalmente com `notepad "%TEMP%\ctprime-instalar-desconto.ps1"`.
3. Rodar:

   ```cmd
   powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\ctprime-instalar-desconto.ps1"
   ```

O instalador baixa uma cópia do código anterior e do novo. **Se algum arquivo instalado divergir da versão anterior publicada no GitHub, interrompe sem modificar o CT Prime** e informa qual arquivo precisa ser revisado. Valida a sintaxe JavaScript antes de pedir confirmação.

Quando solicitar, digite `ATUALIZAR`. O script para temporariamente o serviço PM2, copia um backup para `C:\CTPRIME\backups\desconto-<data>` (inclusive do banco `data`), atualiza **somente** os arquivos alterados, religa o serviço e confirma o endpoint local e as configurações. Se a validação falhar, tenta restaurar arquivos e base do backup.

Não altera `.env`, `uploads`, `node_modules`, nem a rede.

## Teste depois da atualização

1. Abrir `http://localhost:3000/index.html` no PC e logar como admin.
2. Acessar **Configurações**, selecionar um desconto (por exemplo, 10%) e cadastrar um funcionário.
3. Guardar o código individual entregue pelo sistema.
4. No celular do mesmo Wi-Fi, acessar `http://192.168.4.200:3000/cardapio.html`.
5. Adicionar produtos, aplicar o código, conferir subtotal, desconto e Pix, e realizar um pedido de teste.
6. Verificar que o pedido aparece no painel e na comanda com o total líquido e no fechamento do caixa.
7. Tentar código inválido e funcionário desativado: nenhum desconto deve ser concedido.
8. Validar compras de clientes sem código: preço normal, sem regressões.

## Observações

- O benefício é configurado para **todos os produtos** em cada pedido, não individualmente por item.
- Códigos são guardados como SHA-256, sem texto puro; o sistema gera códigos de 64 bits aleatórios.
- Não enviar arquivos `.env` nem o banco de dados a terceiros sem necessidade.
- O percentual e o cadastro ficam no banco local. A instalação não depende de internet após ser concluída.
- Antes de atualização do Windows/PM2, confirme o funcionamento do CT Prime após reinicialização, de preferência fora do expediente.
