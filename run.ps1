# Centralized Emergency Ambulance Dispatch & Real-Time Hospital Telemetry Launcher
# Production 1-Click Executor for Express Backend (:5000), FastAPI (:8000) & Vite React Frontend (:3000)

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Get-Location
}

# Resolve inner directory if present
if (Test-Path "$ScriptDir\centralized platform") {
    $ProjectRoot = "$ScriptDir\centralized platform"
} else {
    $ProjectRoot = $ScriptDir
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  CENTRALIZED EMERGENCY AMBULANCE DISPATCH & TELEMETRY PLATFORM   " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Root Directory: $ProjectRoot" -ForegroundColor Gray

# 1. SCAN AND TERMINATE CONFLICTING PROCESSES ON PORTS 5000, 8000 AND 3000
Write-Host "[1/4] Scanning for conflicting processes on ports 5000, 8000, and 3000..." -ForegroundColor Yellow

$Ports = @(5000, 8000, 3000)
foreach ($Port in $Ports) {
    $Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($Connections) {
        foreach ($Conn in $Connections) {
            $PIDToKill = $Conn.OwningProcess
            if ($PIDToKill -gt 0) {
                Write-Host "  -> Terminating process PID $PIDToKill locking port $Port..." -ForegroundColor Red
                Stop-Process -Id $PIDToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Start-Sleep -Seconds 1

# Load Gemini API Key if available
$GeminiKey = if ($env:GEMINI_API_KEY) { $env:GEMINI_API_KEY } else { "" }

# 2. LAUNCH EXPRESS & SOCKET.IO BACKEND (PORT 5000)
Write-Host "[2/4] Launching Express & Socket.IO Telemetry Backend (Port 5000)..." -ForegroundColor Yellow
$BackendCmd = "`$env:GEMINI_API_KEY='$GeminiKey'; cd '$ProjectRoot\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit -Command `"$BackendCmd`""

# 3. LAUNCH FASTAPI AI TRAUMA ENGINE (PORT 8000)
Write-Host "[3/4] Launching FastAPI AI Audio Trauma Engine (Port 8000)..." -ForegroundColor Yellow
$FastApiCmd = "`$env:GEMINI_API_KEY='$GeminiKey'; cd '$ProjectRoot\backend'; python main.py"
Start-Process powershell -ArgumentList "-NoExit -Command `"$FastApiCmd`""

# 4. LAUNCH VITE REACT FRONTEND (PORT 3000)
Write-Host "[4/4] Launching Vite React Dashboard (Port 3000)..." -ForegroundColor Yellow
$FrontendCmd = "cd '$ProjectRoot\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit -Command `"$FrontendCmd`""

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " SUCCESS: Centralized Platform Services Started!                 " -ForegroundColor Green
Write-Host "  - Frontend Portal UI:       http://localhost:3000              " -ForegroundColor White
Write-Host "  - Dispatch REST/WS API:     http://localhost:5000/api          " -ForegroundColor White
Write-Host "  - FastAPI AI Trauma Docs:   http://localhost:8000/docs         " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
