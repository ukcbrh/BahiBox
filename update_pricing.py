with open('src/pages/Pricing.tsx', 'r') as f:
    content = f.read()

target1 = """function getOfficialModuleName(raw: string, fallback: string = 'Retail POS') {
  if (!raw) return fallback;
  const l = raw.toLowerCase();
  if (l.includes('retail')) return 'Retail POS';
  if (l.includes('manufacturing')) return 'Manufacturing';
  if (l.includes('education')) return 'Education';
  if (l.includes('healthcare') || l.includes('health')) return 'Healthcare';
  if (l.includes('hotel') || l.includes('hospitality') || l.includes('restaurant')) return 'Hotel & Restaurant';
  if (l.includes('transport') || l.includes('logistic')) return 'Transport';
  if (l.includes('service')) return 'Daily Services';
  if (l.includes('agri') || l.includes('farm')) return 'Agriculture';
  return raw;
}
"""

repl1 = ""
if target1 in content:
    content = content.replace(target1, repl1)
else:
    print("target1 not found")

target2 = """  const availableModules = Array.from(new Set(plans.map(p => p.moduleName)));
  const defaultModule = availableModules.includes('Retail POS') ? 'Retail POS' : (availableModules[0] || 'Retail POS');
  const rawModuleName = (searchParams.get('module') || defaultModule) as string;
  const moduleName = getOfficialModuleName(rawModuleName, rawModuleName);"""

repl2 = """  const availableModules = Array.from(new Set(plans.map(p => p.moduleName)));
  const defaultModuleKey = plans.find(p => p.moduleName === 'Retail POS')?.moduleKey || (plans[0]?.moduleKey || 'retail');
  const rawModuleKey = (searchParams.get('module') || defaultModuleKey) as string;
  const moduleName = plans.find(p => p.moduleKey === rawModuleKey)?.moduleName || rawModuleKey;"""

if target2 in content:
    content = content.replace(target2, repl2)
else:
    print("target2 not found")


target3 = """                <Select value={moduleName} onValueChange={(val) => setSearchParams({ module: val })}>
                  <SelectTrigger className="w-full h-12 text-lg font-medium bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.map(mod => (
                      <SelectItem key={mod} value={mod}>{getOfficialModuleName(mod, mod)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>"""

repl3 = """                <Select value={rawModuleKey} onValueChange={(val) => setSearchParams({ module: val })}>
                  <SelectTrigger className="w-full h-12 text-lg font-medium bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.map(mod => {
                      const key = plans.find(p => p.moduleName === mod)?.moduleKey || mod;
                      return <SelectItem key={key} value={key}>{mod}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>"""

if target3 in content:
    content = content.replace(target3, repl3)
else:
    print("target3 not found")

with open('src/pages/Pricing.tsx', 'w') as f:
    f.write(content)
print("done")
