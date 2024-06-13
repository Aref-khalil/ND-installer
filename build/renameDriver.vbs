
' Section which actually (re)names the Mapped Drive
Set objShell = CreateObject("Shell.Application")
objShell.NameSpace("P:").Self.Name = "MyWebServer"


WScript.Quit