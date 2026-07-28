#Requires AutoHotkey v2.0
#SingleInstance Force

; Minimal test: pop up a message box when Ctrl+Alt+E is pressed
; Run this version first to verify the hotkey isn't captured by another app.

^!e:: {
    MsgBox("Hotkey Ctrl+Alt+E works!")
}