@echo off
:: إنشاء اختصارات على سطح المكتب
set "DESKTOP=%USERPROFILE%\Desktop"
set "TARGET=%~dp0"

echo.
echo ============================================================
echo    إنشاء اختصارات نظام السند على سطح المكتب
echo ============================================================
echo.

:: اختصار تشغيل النظام
mshta VBScript:Execute("Set a=CreateObject(""WScript.Shell""):Set b=a.CreateShortcut(a.SpecialFolders(""Desktop"") & ""\نظام السند - تشغيل.lnk""):b.TargetPath=""%TARGET%start_system.bat"":b.WorkingDirectory=""%TARGET%"":b.Save:close")

:: اختصار إيقاف النظام
mshta VBScript:Execute("Set a=CreateObject(""WScript.Shell""):Set b=a.CreateShortcut(a.SpecialFolders(""Desktop"") & ""\نظام السند - إيقاف.lnk""):b.TargetPath=""%TARGET%stop_system.bat"":b.WorkingDirectory=""%TARGET%"":b.Save:close")

:: اختصار إعادة التشغيل
mshta VBScript:Execute("Set a=CreateObject(""WScript.Shell""):Set b=a.CreateShortcut(a.SpecialFolders(""Desktop"") & ""\نظام السند - إعادة تشغيل.lnk""):b.TargetPath=""%TARGET%restart_system.bat"":b.WorkingDirectory=""%TARGET%"":b.Save:close")

:: اختصار حالة النظام
mshta VBScript:Execute("Set a=CreateObject(""WScript.Shell""):Set b=a.CreateShortcut(a.SpecialFolders(""Desktop"") & ""\نظام السند - الحالة.lnk""):b.TargetPath=""%TARGET%status_system.bat"":b.WorkingDirectory=""%TARGET%"":b.Save:close")

echo.
echo ============================================================
echo    ✓ تم إنشاء الاختصارات بنجاح!
echo ============================================================
echo.
echo تم إنشاء 4 اختصارات على سطح المكتب:
echo   • نظام السند - تشغيل
echo   • نظام السند - إيقاف
echo   • نظام السند - إعادة تشغيل
echo   • نظام السند - الحالة
echo.
echo يمكنك الآن استخدام هذه الاختصارات مباشرة من سطح المكتب
echo.
pause
