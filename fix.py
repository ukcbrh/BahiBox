with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """                <button
                  onClick={(e) => { e.stopPropagation(); setQrTable(table); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10"
                  title="Show QR Code"
                >
                  <QrCode size={12} />
                </button>
                {occupiedSeats > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingTable(table); setNewTable({ table_number: table.table_number, dining_area: table.dining_area || '', capacity: String(table.capacity) }); setIsAddingTable(true); }}
                  className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10"
                  title="Edit Table"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                  className="absolute top-1 left-8 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10 text-red-600"
                  title="Delete Table"
                >
                  <Trash2 size={12} />
                </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetTable(table.id); }}
                    className="absolute bottom-1 right-1 text-[9px] font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded-full z-10"
                    title="Reset Table"
                  >
                    Reset
                  </button>
                )}"""

replacement = """                <button
                  onClick={(e) => { e.stopPropagation(); setQrTable(table); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10"
                  title="Show QR Code"
                >
                  <QrCode size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingTable(table); setNewTable({ table_number: table.table_number, dining_area: table.dining_area || '', capacity: String(table.capacity) }); setIsAddingTable(true); }}
                  className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10"
                  title="Edit Table"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                  className="absolute top-1 left-8 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10 text-red-600"
                  title="Delete Table"
                >
                  <Trash2 size={12} />
                </button>
                {occupiedSeats > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetTable(table.id); }}
                    className="absolute bottom-1 right-1 text-[9px] font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded-full z-10"
                    title="Reset Table"
                  >
                    Reset
                  </button>
                )}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Fixed successfully")
else:
    print("Target not found")
