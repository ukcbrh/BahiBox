import re

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

target = """        {/* Header */}
        <header className="z-10 sticky top-0 bg-slate-600 dark:bg-slate-950 pt-12">
          <div className="bg-white dark:bg-slate-900 px-4 pt-6 pb-4 rounded-t-[32px] border-b border-slate-100 dark:border-slate-800">"""

replacement = """        {/* Header */}
        <header className="z-10 sticky top-0 bg-[#475569] dark:bg-slate-950 pt-2">
          <div className="bg-white dark:bg-slate-900 px-4 pt-4 pb-4 rounded-t-2xl border-b border-slate-100 dark:border-slate-800">"""

if target in content:
    content = content.replace(target, replacement)
    
    # Also update the root container color to match the hex color if needed
    root_target = 'className="min-h-screen bg-slate-600 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col relative"'
    root_replacement = 'className="min-h-screen bg-[#475569] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col relative"'
    content = content.replace(root_target, root_replacement)
    
    with open('src/pages/PublicApp.tsx', 'w') as f:
        f.write(content)
    print("Updates applied.")
else:
    print("Target not found.")
