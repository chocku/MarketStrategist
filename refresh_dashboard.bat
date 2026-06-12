@echo off
cd /d "C:\Users\chock\OneDrive\Desktop\Trading Projects\StockDashboard"

echo ========================================
echo  Stock Dashboard Daily Refresh
echo ========================================
echo.

echo [1/3] Fetching latest market data...
python fetch_breadth.py
if %errorlevel% neq 0 (
    echo ERROR: Data fetch failed. Aborting.
    pause
    exit /b 1
)

echo.
echo [2/3] Committing data...
git add data.json
git commit -m "Data refresh: %date:~10,4%-%date:~4,2%-%date:~7,2%"
if %errorlevel% neq 0 (
    echo ERROR: Git commit failed. Aborting.
    pause
    exit /b 1
)

echo.
echo [3/3] Pushing to GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo ERROR: Git push failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Done! Dashboard updated successfully.
echo ========================================
pause
