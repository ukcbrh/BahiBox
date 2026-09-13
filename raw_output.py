import subprocess
import sys

def run_cmd(cmd):
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return res.stdout + res.stderr
    except Exception as e:
        return str(e)

print("=== Command 1 ===")
print(run_cmd("grep -n '\`' src/components/retail/CreditNoteList.tsx src/components/retail/DebitNoteList.tsx src/components/documents/DocumentsHub.tsx src/components/SettingsGeneral.tsx"))

print("=== Command 2 ===")
print(run_cmd("find / -path \"*/app/applet/app/applet*\" 2>/dev/null"))

print("=== Command 3 ===")
print(run_cmd("find / -iname \"CreditNoteList.tsx\" -o -iname \"DebitNoteList.tsx\" 2>/dev/null"))
