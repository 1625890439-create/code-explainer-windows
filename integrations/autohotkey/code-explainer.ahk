#Requires AutoHotkey v2.0
#SingleInstance Force

; Global entry point. Ctrl+Alt+E copies the current selection without losing the
; user clipboard, then sends it to the running desktop app via a named pipe.
;
; The pipe-client.js script reads the session token from the Electron app's
; userData directory, accepts code on stdin, and handles the connection.

NodeExe := "node"
PipeClient := A_ScriptDir "\\..\\..\\apps\\desktop\\dist\\main\\pipe-client.js"

^!e:: {
    ; Save original clipboard
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

    ; Write selection to temp file, then pipe to node client via stdin
    TempFile := A_Temp "\\code-explainer-selection.txt"
    FileOpen(TempFile, "w", "UTF-8").Write(selectedCode)

    ; Run pipe-client and feed it the selection via stdin redirection
    RunWait 'cmd.exe /c "' NodeExe '" "' PipeClient '" < "' TempFile '"', , "Hide"

    FileDelete(TempFile)
}