#Requires AutoHotkey v2.0
#SingleInstance Force

; Ctrl+Alt+E: 复制当前选中文本，通过 named pipe 发送给 Code Explainer
; 需要 Electron 桌面端正在运行（会生成 .pipe-token 文件）

NodeExe := "node"
; 相对于脚本所在目录 (integrations/autohotkey/) 找到 pipe-client.js
PipeClient := A_ScriptDir "\..\..\apps\desktop\out\main\pipe-client.js"

^!e:: {
    ; 1. 保存原始剪切板
    originalClipboard := ClipboardAll()
    A_Clipboard := ""
    Send "^c"
    if !ClipWait(0.8) {
        A_Clipboard := originalClipboard
        return
    }

    ; 2. 读取选中文本
    selectedCode := A_Clipboard

    ; 3. 恢复原始剪切板
    A_Clipboard := originalClipboard

    if (StrLen(Trim(selectedCode)) = 0)
        return

    ; 4. 写入临时文件，通过 stdin 传给 pipe-client
    TempFile := A_Temp "\code-explainer-selection.txt"
    FileOpen(TempFile, "w", "UTF-8").Write(selectedCode)

    RunWait 'cmd.exe /c "' NodeExe '" "' PipeClient '" < "' TempFile '"', , "Hide"

    FileDelete(TempFile)
}