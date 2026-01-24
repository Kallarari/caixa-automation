# Script para iniciar processamento paralelo com N workers
# Divide as cidades e inicia cada worker em uma janela separada

# Quantidade de workers (ajuste aqui)
$WORKER_COUNT = 4

Write-Host "Iniciando processamento paralelo com $WORKER_COUNT workers..." -ForegroundColor Green
Write-Host ""

# Passo 1: Divide as cidades em grupos
Write-Host "Passo 1: Dividindo cidades em grupos..." -ForegroundColor Yellow
$env:MODE = "divide"
$env:WORKER_COUNT = "$WORKER_COUNT"
npm run dev

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao dividir cidades" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Divisao concluida!" -ForegroundColor Green
Write-Host ""

# Passo 2: Inicia os workers em janelas separadas
Write-Host "Passo 2: Iniciando $WORKER_COUNT workers em janelas separadas..." -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $WORKER_COUNT; $i++) {
    $workerId = $i
    $title = "Worker $($workerId + 1)"
    
    Write-Host "   Iniciando $title..." -ForegroundColor Gray
    
    # Constrói o comando de forma mais segura
    $command = "cd '$PWD'; `$host.UI.RawUI.WindowTitle = '$title'; Write-Host '$title iniciado' -ForegroundColor Cyan; Write-Host ''; `$env:WORKER_ID='$workerId'; `$env:WORKER_COUNT='$WORKER_COUNT'; `$env:MODE='worker'; npm run dev"
    
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        $command
    )
    
    # Pequeno delay entre cada worker
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "$WORKER_COUNT workers iniciados em janelas separadas!" -ForegroundColor Green
Write-Host ""
Write-Host "Dica: Cada worker processara suas cidades em paralelo." -ForegroundColor Yellow
Write-Host "   Voce pode monitorar o progresso em cada janela." -ForegroundColor Yellow
Write-Host ""