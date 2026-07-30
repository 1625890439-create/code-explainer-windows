#Requires AutoHotkey v2.0
#SingleInstance Force

; ─── 启动 Electron ───
Run "cmd.exe /c cd /d C:\Users\admin\Desktop\Hermes\code-explainer-windows\apps\desktop && npm run dev", , "Minimize"

; ─── 等待 Electron 启动完成（pipe-token 写入） ───
Loop 30 {
    if FileExist("C:\Users\admin\Desktop\Hermes\code-explainer-windows\.pipe-token")
        break
    Sleep 2000
}

MsgBox "Code Explainer 已启动！`n热键: Ctrl+Alt+\", "启动完成"

; ─── 加载热键脚本 ───
Run A_AhkPath ' "C:\Users\admin\Desktop\Hermes\code-explainer-windows\integrations\autohotkey\code-explainer.ahk"'

ExitApp