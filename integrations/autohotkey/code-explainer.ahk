#Requires AutoHotkey v2.0
#SingleInstance Force

; Global entry point. Ctrl+Alt+E copies the current selection without losing the
; user clipboard, then starts the packaged CLI. Replace AppPath during packaging.
AppPath := A_ScriptDir "\\..\\..\\apps\\desktop\\Code Explainer.exe"

^!e:: {
    originalClipboard := ClipboardAll()
    A_Clipboard := ""
    Send "^c"
    if !ClipWait(0.8) {
        A_Clipboard := originalClipboard
        return
    }

    selectedCode := A_Clipboard
    A_Clipboard := originalClipboard
    if (StrLen(Trim(selectedCode)) = 0)
        return

    ; Phase 1: pass text through a temporary named-pipe client, never through a command line.
    ; Phase 2 implementation lives in apps/desktop/src/main/selection-server.ts.
    Run '"' AppPath '" --selection-from-hotkey'
}

