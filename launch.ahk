#Requires AutoHotkey v2.0
#SingleInstance Force

ProjectRoot := "C:\Users\admin\Desktop\Hermes\code-explainer-windows"
DesktopRoot := ProjectRoot . "\apps\desktop"
LogDir := ProjectRoot . "\logs"
LogFile := LogDir . "\ce.log"
PipeToken := ProjectRoot . "\.pipe-token"
HotkeyScript := ProjectRoot . "\integrations\autohotkey\code-explainer.ahk"

; 创建日志目录
DirCreate(LogDir)

; 后台启动 npm run dev
Run(
    A_ComSpec . ' /d /c npm.cmd run dev >> "' . LogFile . '" 2>&1',
    DesktopRoot,
    "Hide"
)

; 等待 Electron 启动完成
Loop 30
{
    if FileExist(PipeToken)
        break

    Sleep 2000
}

; 启动完成提示
MsgBox(
    "Code Explainer 已启动！`n`n热键: Ctrl+Alt-\",
    "启动完成"
)

; 启动热键脚本
Run(
    '"' . A_AhkPath . '" "' . HotkeyScript . '"'
)

ExitApp