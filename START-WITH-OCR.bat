@echo off
echo.
echo ========================================
echo   ATOS Fit - Starting with InBody OCR
echo ========================================
echo.

echo 🔧 Installing dependencies...
call npm install

echo.
echo 🚀 Starting proxy server (for DeepSeek AI + Huawei OCR)...
start "Proxy Server" cmd /k "node proxy-server.js"

echo.
echo ⏳ Waiting for proxy server to start...
timeout /t 3 /nobreak >nul

echo.
echo 🌐 Starting frontend application...
start "ATOS Fit App" cmd /k "npm run dev"

echo.
echo ✅ ATOS Fit is starting with InBody OCR support!
echo.
echo 📱 Frontend: http://localhost:4028
echo 🔧 Proxy Server: http://localhost:3001
echo 🔍 InBody Scanner: Available in AI Chat
echo.
echo 🧪 Test InBody OCR: Open test-inbody-scanner.html
echo.
echo Press any key to close this window...
pause >nul