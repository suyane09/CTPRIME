# CT Prime — Guia de Deploy Híbrido (Offline + Qualquer Rede)

Este guia deixa o sistema:
- ✅ Funcionando de **qualquer rede/lugar** quando tem internet
- ✅ Funcionando **offline dentro da loja** se a internet cair (painel, cardápio, pedidos, tudo)

A ideia: o servidor Node continua rodando **local**, no PC da loja (fonte única de dados,
sem risco de dessincronizar pedidos). O Cloudflare Tunnel abre uma porta seca e segura
pra internet enxergar esse mesmo servidor, sem precisar mexer no roteador.

---

## FASE 1 — Teste rápido (sem gastar nada, sem domínio)

Use isso pra validar que tudo funciona antes de deixar permanente.

1. Instale o cloudflared (uma vez só):
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Dê dois cliques em **`start-teste.bat`** (está na raiz do projeto).
   Ele abre duas janelas: uma com o servidor, outra com o túnel.
3. Copie a URL que aparecer na janela do túnel (tipo `https://palavras-aleatorias.trycloudflare.com`).
4. **Teste de acesso externo:** abra essa URL no celular com Wi-Fi desligado (só 4G).
5. **Teste de offline:** desconecte o cabo de internet do roteador da loja (sem desligar o
   Wi-Fi) e acesse pelo IP local (`http://192.168.x.x:3000`) de outro aparelho na mesma rede.

Se os dois testes passarem, siga pra Fase 2.

⚠️ Nessa fase, o `.env` precisa estar com `ALLOWED_ORIGINS=` (vazio), porque a URL de teste
muda toda vez. Isso deixa a API aberta pra qualquer origem — é só pra teste, nunca deixe
assim em produção.

---

## FASE 2 — Produção (domínio fixo, tudo automático)

### 2.1 Registrar um domínio
Registre em [namecheap.com](https://namecheap.com) ou [porkbun.com](https://porkbun.com)
(~US$10-15/ano, não precisa CPF/CNPJ).

### 2.2 Adicionar no Cloudflare
1. Crie conta grátis em [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Add a Site** → seu domínio → plano **Free**
3. Troque os nameservers no Namecheap/Porkbun pelos que o Cloudflare indicar
4. Espere confirmar (minutos a poucas horas)

### 2.3 Rodar a instalação automática
Clique com o botão direito em **`instalar-producao.bat`** → **Executar como administrador**.
Ele te guia por:
- Instalar PM2 e deixar o servidor subindo sozinho com o Windows
- Login no Cloudflare
- Criar o túnel nomeado
- Apontar o domínio pro túnel
- Instalar o túnel como serviço do Windows (sobe sozinho, sem precisar estar logado)

### 2.4 Ajustar o `.env`
Depois de rodar o script, edite o `.env` (arquivo real, não o `.env.example`):
```
ALLOWED_ORIGINS=http://localhost:3000,https://app.seudominio.com
```
Reinicie: `pm2 restart ctprime-api`

---

## Checklist final

| Cenário | O que confirma que está OK |
|---|---|
| Internet OK, acesso de fora | `https://app.seudominio.com/cardapio.html` abre no 4G |
| Internet OK, acesso de dentro | `http://192.168.x.x:3000` abre na Wi-Fi da loja |
| Internet caiu, acesso de dentro | Mesmo com o cabo desconectado, `http://192.168.x.x:3000` continua funcionando |
| PC reiniciou sozinho (queda de luz) | `pm2 list` mostra `ctprime-api` rodando; túnel volta sozinho (serviço do Windows) |

## Comandos úteis do dia a dia

```powershell
pm2 status              REM ver se o servidor está de pé
pm2 logs ctprime-api    REM ver logs em tempo real
pm2 restart ctprime-api REM reiniciar depois de mudar o .env
sc query cloudflared    REM ver se o serviço do tunel está rodando
```
