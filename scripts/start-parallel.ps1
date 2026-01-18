# Script para iniciar processamento paralelo com 6 workers
# Divide as cidades e inicia cada worker em uma janela separada

Write-Host "Iniciando processamento paralelo com 6 workers..." -ForegroundColor Green
Write-Host ""

# Passo 1: Divide as cidades em grupos
Write-Host "Passo 1: Dividindo cidades em grupos..." -ForegroundColor Yellow
$env:MODE = "divide"
npm run dev

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao dividir cidades" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Divisao concluida!" -ForegroundColor Green
Write-Host ""

# Passo 2: Inicia os 6 workers em janelas separadas
Write-Host "Passo 2: Iniciando 6 workers em janelas separadas..." -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt 6; $i++) {
    $workerId = $i
    $title = "Worker $($workerId + 1)"
    
    Write-Host "   Iniciando $title..." -ForegroundColor Gray
    
    # Constrói o comando de forma mais segura
    $command = "cd '$PWD'; `$host.UI.RawUI.WindowTitle = '$title'; Write-Host '$title iniciado' -ForegroundColor Cyan; Write-Host ''; `$env:WORKER_ID='$workerId'; `$env:MODE='worker'; npm run dev"
    
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        $command
    )
    
    # Pequeno delay entre cada worker
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "6 workers iniciados em janelas separadas!" -ForegroundColor Green
Write-Host ""
Write-Host "Dica: Cada worker processara suas cidades em paralelo." -ForegroundColor Yellow
Write-Host "   Voce pode monitorar o progresso em cada janela." -ForegroundColor Yellow
Write-Host ""