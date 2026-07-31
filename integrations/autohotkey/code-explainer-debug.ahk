#Requires AutoHotkey v2.0
#SingleInstance Force

ProjectRoot := "C:\Users\admin\Desktop\Hermes\code-explainer-windows"
PipeClient := ProjectRoot . "\pipe-client.js"

; 通用 debug：复制选中文本 → 发送给 pipe（每步弹窗）
SendToExplainerDebug(label, copyKeys) {
    global PipeClient

    MsgBox("① 热键触发：" . label . " 被捕获", "Debug Step 1/6")

    KeyWait "Ctrl"
    KeyWait "Alt"

    MsgBox("② 准备复制：将读取选中文本（" . copyKeys . "）", "Debug Step 2/6")

    originalClipboard := ClipboardAll()
    A_Clipboard := ""
    Send copyKeys
    if !ClipWait(2) {
        MsgBox("❌ 复制超时：2秒内未获取到剪贴板内容", "Debug - 失败")
        A_Clipboard := originalClipboard
        return
    }

    selectedCode := A_Clipboard
    A_Clipboard := originalClipboard

    if (selectedCode = "") {
        MsgBox("❌ 选中文本为空", "Debug - 失败")
        return
    }

    MsgBox("③ 复制成功：" . StrLen(selectedCode) . " 个字符", "Debug Step 3/6")

    TempFile := A_Temp . "\ce-sel.txt"
    try FileDelete(TempFile)
    FileAppend(selectedCode, TempFile, "UTF-8")

    MsgBox("④ 已写入临时文件：`n" . TempFile, "Debug Step 4/6")

    cmd := "cmd.exe /c node "
    cmd .= Chr(34) . PipeClient . Chr(34)
    cmd .= " < "
    cmd .= Chr(34) . TempFile . Chr(34)

    MsgBox("⑤ 准备执行 pipe-client：`n`n" . cmd, "Debug Step 5/6")

    RunWait cmd, , "Hide"

    MsgBox("⑥ pipe-client 已返回（退出码: " . A_LastError . "）" . "`n按确定后清理临时文件", "Debug Step 6/6")

    try FileDelete(TempFile)
}

; 普通应用：Ctrl+Alt+Z → Ctrl+C
^!SC02C:: SendToExplainerDebug("Ctrl+Alt+Z", "^c")

; 终端/shell：Ctrl+Alt+X → Ctrl+Shift+C
^!SC02D:: SendToExplainerDebug("Ctrl+Alt+X", "^+c")