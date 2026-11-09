# CT Prime: simplificar codigo compartilhado para cinco digitos
# Execute como administrador, preferencialmente com a cafeteria fechada.
# Não usa Cloudflare nem precisa de um domínio. Necessita internet somente para baixar a atualização.
# Faz backup da base SQLite com o servidor parado. Não altera .env, uploads, nem node_modules.
param()

$ErrorActionPreference = "Stop"
$root = "C:\CTPRIME"
$repo = "suyane09/CTPRIME"
$branch = "main"
$arquivosAntigos = @("routes/descontos.js", "services/descontos.js", "public/index.html", "public/cardapio.html", "public/sw.js")
$arquivosNovos = @()
$arquivos = @($arquivosAntigos) + @($arquivosNovos)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$temporario = Join-Path $env:TEMP "ctprime-desconto-$timestamp"
$backup = Join-Path $root "backups\desconto-$timestamp"
$servicoParado = $false
$arquivosInstalados = $false
$rollbackConcluido = $false

function Obter-RaizZip([string]$arquivo, [string]$destino) {
  Expand-Archive -LiteralPath $arquivo -DestinationPath $destino -Force
  $raiz = Get-ChildItem -LiteralPath $destino -Directory | Select-Object -First 1
  if (-not $raiz) { throw "Falha ao identificar os arquivos extraidos de $arquivo" }
  return $raiz.FullName
}
function Mesmo-Hash([string]$a, [string]$b) {
  return (Get-FileHash -LiteralPath $a -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $b -Algorithm SHA256).Hash
}
function Restaurar-Arquivos {
  foreach ($relativo in $arquivos) {
    $dest = Join-Path $root $relativo
    $original = Join-Path $backup $relativo
    if (Test-Path -LiteralPath $original -PathType Leaf) {
      Copy-Item -LiteralPath $original -Destination $dest -Force
    } elseif ($arquivosNovos -contains $relativo) {
      Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
    }
  }
}
function Conferir-Saude {
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    try {
      $res = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 3
      if ($res.status -eq "ok") { return $true }
    } catch {}
  }
  return $false
}

try {
  if (-not (Test-Path -LiteralPath (Join-Path $root "server.js"))) {
    throw "Nao encontrei o CT Prime em C:\CTPRIME"
  }
  $admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) { throw "Abra o CMD ou PowerShell como administrador." }

  $servico = Get-Service -Name "pm2.exe" -ErrorAction Stop
  if ($servico.Status -ne "Running") { throw "O servico pm2.exe nao esta ativo. Verifique antes de atualizar." }

  Write-Host "BAIXANDO CODIGO E PREPARANDO MESCLA COM A VERSAO DA ACADEMIA..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $temporario -Force | Out-Null
  $zipNovo = Join-Path $temporario "novo.zip"
  $zipBase = Join-Path $temporario "base.zip"
  Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/$repo/zipball/$branch" -OutFile $zipNovo
  Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/$repo/zipball/36434315d2b52891b302a1199b16683b683a60fb" -OutFile $zipBase
  $novo = Obter-RaizZip $zipNovo (Join-Path $temporario "novo")
  $base = Obter-RaizZip $zipBase (Join-Path $temporario "base")

  # Mescla o codigo novo com as modificacoes exclusivas da academia.
  # Toda a preparacao e validacao acontecem em pasta temporaria, SEM parar o servidor.
  $stage = Join-Path $temporario "stage"
  $mesclador = Join-Path $novo "mesclar-codigo-5digitos-local.js"
  if (!(Test-Path -LiteralPath $mesclador -PathType Leaf)) {
    throw "Mesclador nao encontrado no pacote baixado."
  }
  & node $mesclador $base $novo $root $stage
  if ($LASTEXITCODE -ne 0) {
    throw "Mescla segura nao foi possivel. O sistema da academia nao foi alterado."
  }

  # Nao prossegue se o codigo mesclado apresentar erro de sintaxe.
  foreach ($relativo in @("routes/descontos.js", "services/descontos.js", "public/sw.js")) {
    & node --check (Join-Path $stage $relativo)
    if ($LASTEXITCODE -ne 0) { throw "JavaScript invalido em $relativo" }
  }

  Write-Host "PRE-VERIFICACOES OK. O servidor sera parado durante a instalacao." -ForegroundColor Yellow
  $confirmar = Read-Host "A cafeteria esta FECHADA? Digite ATUALIZAR para continuar"
  if ($confirmar -cne "ATUALIZAR") { Write-Host "Cancelado sem alteracoes."; return }

  Stop-Service -Name "pm2.exe" -ErrorAction Stop
  (Get-Service -Name "pm2.exe").WaitForStatus("Stopped", [TimeSpan]::FromSeconds(25))
  $servicoParado = $true
  Start-Sleep -Seconds 2
  $ocupado = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if ($ocupado) { throw "A porta 3000 continua ocupada, mesmo apos parar o servico. Sem alteracoes; verifique processos." }

  New-Item -ItemType Directory -Path $backup -Force | Out-Null
  foreach ($relativo in $arquivosAntigos) {
    $destino = Join-Path $backup $relativo
    New-Item -ItemType Directory -Path (Split-Path $destino) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $root $relativo) -Destination $destino -Force
  }
  if (Test-Path -LiteralPath (Join-Path $root "data")) {
    Copy-Item -LiteralPath (Join-Path $root "data") -Destination (Join-Path $backup "data") -Recurse -Force
  }

  $arquivosInstalados = $true
  foreach ($relativo in $arquivos) {
    $destino = Join-Path $root $relativo
    New-Item -ItemType Directory -Path (Split-Path $destino) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $stage $relativo) -Destination $destino -Force
  }
  Start-Service -Name "pm2.exe"
  $servicoParado = $false
  if (!(Conferir-Saude)) { throw "Servidor nao voltou a responder em 127.0.0.1:3000" }

  $cfg = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/configuracoes" -TimeoutSec 5
  if ($null -eq $cfg.descontoPercentual) { throw "Coluna de desconto nao foi carregada. Ativando rollback." }

  Write-Host ""
  Write-Host "INSTALACAO CONCLUIDA. Banco preservado, servidor ativo." -ForegroundColor Green
  Write-Host "Backup: $backup"
  Write-Host "Entre em http://localhost:3000/index.html -> Configuracoes -> Desconto de funcionarios."
  Write-Host "Confira o percentual e gere o NOVO codigo curto. O percentual atual sera mantido. Gere um NOVO codigo de 5 numeros para substituir o antigo."
} catch {
  Write-Host "FALHA: $($_.Exception.Message)" -ForegroundColor Red
  if ($arquivosInstalados) {
    try {
      if ((Get-Service "pm2.exe").Status -eq "Running") {
        Stop-Service -Name "pm2.exe" -ErrorAction Stop
        (Get-Service -Name "pm2.exe").WaitForStatus("Stopped", [TimeSpan]::FromSeconds(25))
      }
      Restaurar-Arquivos
      if (Test-Path -LiteralPath (Join-Path $backup "data")) {
        $dataDestino = Join-Path $root "data"
        if (Test-Path $dataDestino) { Remove-Item -LiteralPath $dataDestino -Recurse -Force }
        Copy-Item -LiteralPath (Join-Path $backup "data") -Destination $dataDestino -Recurse -Force
      }
      $rollbackConcluido = $true
      Write-Host "Arquivos e dados restaurados do backup." -ForegroundColor Yellow
    } catch {
      Write-Host "ATENCAO: rollback falhou: $($_.Exception.Message). Necessaria verificacao manual." -ForegroundColor Red
    }
  }
  try {
    if ((Get-Service -Name "pm2.exe").Status -ne "Running") { Start-Service "pm2.exe" }
    $servicoParado = $false
  } catch { Write-Host "ATENCAO: servico nao reiniciado. Verifique pm2.exe manualmente." -ForegroundColor Red }
  throw
} finally {
  Write-Host "Pasta temporaria: $temporario"
}
