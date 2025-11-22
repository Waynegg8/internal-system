@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set LC_ALL=en_US.UTF-8
if "%1"=="" (
    npx playwright test --reporter=list --workers=1 --timeout=120000
) else (
    npx playwright test "%1" --reporter=list --workers=1 --timeout=120000
)



