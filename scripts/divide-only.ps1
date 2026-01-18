# Script para apenas dividir as cidades (sem iniciar workers)
# Útil quando você quer dividir novamente sem iniciar os workers

Write-Host "📊 Dividindo cidades em grupos..." -ForegroundColor Yellow
$env:MODE = "divide"
npm run dev

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Divisão concluída!" -ForegroundColor Green
    Write-Host "   Execute: .\scripts\start-parallel.ps1 para iniciar os workers" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Erro ao dividir cidades" -ForegroundColor Red
}
