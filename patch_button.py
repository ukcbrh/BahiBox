with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """                <button onClick={() => openTable(table)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 hover:shadow-md transition-shadow rounded-2xl">
                  <span className="text-2xl font-extrabold">{table.table_number}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{status.label}</span>
                  <span className="text-[10px] opacity-70">{table.capacity} seats</span>
                </button>"""

replacement = """                <button
                  onClick={() => {
                    if (linkMode) {
                      setSelectedForLink(prev => prev.includes(table.id) ? prev.filter(id => id !== table.id) : [...prev, table.id]);
                    } else {
                      openTable(table);
                    }
                  }}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1 hover:shadow-md transition-shadow rounded-2xl ${selectedForLink.includes(table.id) ? 'ring-4 ring-purple-500' : ''} ${table.linked_group_id ? 'ring-2 ring-purple-300' : ''}`}
                >
                  <span className="text-2xl font-extrabold">{table.table_number}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{status.label}</span>
                  <span className="text-[10px] opacity-70">{table.capacity} seats</span>
                  {table.linked_group_id && <span className="text-[8px] font-bold text-purple-600">LINKED</span>}
                </button>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
