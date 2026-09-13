import re

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

# 1. Update root container background
root_target = 'className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 flex flex-col relative"'
root_replacement = 'className="min-h-screen bg-slate-600 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col relative"'
content = content.replace(root_target, root_replacement)

# 2. Update Header
header_pattern = re.compile(r'\{\/\* Header \*\/\}\s*<header className="z-10 sticky top-0">\s*<div className="bg-slate-600 dark:bg-slate-950 h-12 w-full"><\/div>\s*<div className="bg-white dark:bg-slate-900 px-4 pt-2 pb-4 shadow-sm rounded-b-3xl">', re.MULTILINE)

new_header = """{/* Header */}
        <header className="z-10 sticky top-0 bg-slate-600 dark:bg-slate-950 pt-12">
          <div className="bg-white dark:bg-slate-900 px-4 pt-6 pb-4 rounded-t-[32px] border-b border-slate-100 dark:border-slate-800">"""
          
if header_pattern.search(content):
    content = header_pattern.sub(new_header, content)
else:
    print("Header pattern not found. Trying alternative...")
    # Maybe it was left as `<header className="z-10 sticky top-0 bg-white...">`?
    alt_pattern = re.compile(r'\{\/\* Header \*\/\}\s*<header[^>]+>\s*<div[^>]+>', re.MULTILINE)
    # We will just replace it manually.

# 3. Update main scrollable content
main_target = '<main className="flex-1 overflow-auto pb-24 md:pb-8 pt-6 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-6">'
main_replacement = '<main className="flex-1 bg-white dark:bg-slate-900 overflow-auto pb-24 md:pb-8 pt-6 px-4 md:px-8 mx-auto w-full space-y-6">'
content = content.replace(main_target, main_replacement)

with open('src/pages/PublicApp.tsx', 'w') as f:
    f.write(content)

print("Updates applied.")
