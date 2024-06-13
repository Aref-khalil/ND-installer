@echo off
setlocal enabledelayedexpansion

REM verfiy server is up and running 


set Host=localhost
set Port=8401

:: Check if the port is occupied
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":%PortToCheck%"') do (
    echo Port %Port% on %Host% is occupied
	goto :CheckDrive

)

:CheckDrive
REM Define the drive letters to try
set "drive_letters=N S X"
for %%d in (%drive_letters%) do (
    REM Check if the drive letter is already in use
    net use | findstr /i "%%d:" > nul
    if !errorlevel! equ 0 (
        echo Drive %%d: is already in use. Trying the next letter...
    ) else (
        set "available_drive=%%d"
        echo Drive %%d: is available. mapping to !available_drive!
        goto :MapDrive
    )
)

REM If no available drive letters found, exit with an error
echo No available drive letters. Exiting.
exit /b 1

:MapDrive
REM Map the network drive to the specified URL with persistent connection settings
net use !available_drive!: %1 /PERSISTENT:YES

set "NewLabel=Nexus Drive"

:: Set the label for the mapped drive
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\MountPoints2\##localhost@8401#DavWWWRoot" /f /v "_LabelFromReg" /t REG_SZ /d "%NewLabel%"

:: Refresh Explorer to apply changes
taskkill /f /im explorer.exe
start explorer.exe

REM Check if the mapping was successful
if !errorlevel! equ 0 (
    echo Mapped !available_drive!: to %1
) else (
    echo Failed to map !available_drive!: to %1
)



endlocal

