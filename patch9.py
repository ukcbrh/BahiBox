import sys

file_path = 'src/components/hospitality/HospitalityComponents.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add missing lucide imports if needed
if "import {" in content and "lucide-react" in content:
    lucide_import_line = [line for line in content.split('\n') if 'lucide-react' in line][0]
    if "Map," not in lucide_import_line and "Map " not in lucide_import_line:
        content = content.replace(lucide_import_line, lucide_import_line.replace('import {', 'import { Map, Receipt,'))

# Add component imports
imports_to_add = []
if "BranchSettings" not in content:
    imports_to_add.append("import { BranchSettings } from '../BranchSettings';")
if "SettingsGeneral" not in content:
    imports_to_add.append("import { SettingsGeneral } from '../SettingsGeneral';")
if "BillFormatSettings" not in content:
    imports_to_add.append("import { BillFormatSettings } from '../BillFormatSettings';")

if imports_to_add:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import = i
    lines = lines[:last_import+1] + imports_to_add + lines[last_import+1:]
    content = '\n'.join(lines)


target = """// 11. Settings
export const HospitalitySettings = () => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center h-[60vh] flex flex-col items-center justify-center">
    <Settings size={48} className="text-primary mb-4" />
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Settings & Admin Control</h2>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">Master Entries, User Roles, Hardware Settings, Backup, and Audit Trail.</p>
  </div>
);"""

replacement = """// 11. Settings
export const HospitalitySettings = () => {
  const [activeSubTab, setActiveSubTab] = useState('branches');

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <h2 className="text-xl font-bold mb-4 px-3">Settings</h2>

        <button
          onClick={() => setActiveSubTab('branches')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'branches' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Map size={18} /> Branches
        </button>

        <button
          onClick={() => setActiveSubTab('general')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'general' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Settings size={18} /> Bill Generation
        </button>

        <button
          onClick={() => setActiveSubTab('bill_format')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === 'bill_format' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Receipt size={18} /> Bill Format
        </button>
      </div>

      <div className="flex-1 max-w-4xl">
        {activeSubTab === 'branches' && <BranchSettings />}
        {activeSubTab === 'general' && <SettingsGeneral />}
        {activeSubTab === 'bill_format' && (
          <div className="animate-in fade-in duration-300">
            <BillFormatSettings />
          </div>
        )}
      </div>
    </div>
  );
};"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")

