with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

target = """<header className="z-10 sticky top-0 bg-white dark:bg-slate-900 px-4 pt-12 pb-4 shadow-sm rounded-b-3xl">
            <div className="flex items-start justify-between mb-4 mt-2">"""

replacement = """<header className="z-10 sticky top-0">
          <div className="bg-slate-600 dark:bg-slate-950 h-12 w-full"></div>
          <div className="bg-white dark:bg-slate-900 px-4 pt-2 pb-4 shadow-sm rounded-b-3xl">
            <div className="flex items-start justify-between mb-4 mt-2">"""

if target in content:
    with open('src/pages/PublicApp.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Success")
else:
    print("Not found")
