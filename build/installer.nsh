!macro customInstall
  File /oname=$PLUGINSDIR\setup.bat "${BUILD_RESOURCES_DIR}\setup.bat"
  ExecWait '"msiexec" /i "$PLUGINSDIR\setup.bat" /passive'
!macroend
