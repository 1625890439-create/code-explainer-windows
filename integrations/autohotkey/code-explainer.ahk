#Requires AutoHotkey v2.0
#SingleInstance Force

ProjectRoot := "C:\Users\admin\Desktop\Hermes\code-explainer-windows"
PipeClient := ProjectRoot . "\pipe-client.js"

^!SC02B:: {
    KeyWait "Ctrl"
    KeyWait "Alt"

    originalClipboard := ClipboardAll()
    A_Clipboard := ""
    Send "^c"
    if !ClipWait(1) {
        A_Clipboard := originalClipboard
        return
    }

    selectedCode := A_Clipboard
    A_Clipboard := originalClipboard

    if (selectedCode = "")
        return

    TempFile := A_Temp . "\ce-sel.txt"
    try FileDelete(TempFile)
    FileAppend(selectedCode, TempFile, "UTF-8")

    cmd := "cmd.exe /c node "
    cmd .= Chr(34) . PipeClient . Chr(34)
    cmd .= " < "
    cmd .= Chr(34) . TempFile . Chr(34)

    RunWait cmd, , "Hide"

    try FileDelete(TempFile)
}