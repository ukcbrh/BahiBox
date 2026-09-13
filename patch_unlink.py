with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """                {occupiedSeats > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetTable(table.id); }}
                    className="absolute bottom-1 right-1 text-[9px] font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded-full z-10"
                    title="Reset Table"
                  >
                    Reset
                  </button>
                )}
              </div>
            );
          })}"""

replacement = """                {occupiedSeats > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetTable(table.id); }}
                    className="absolute bottom-1 right-1 text-[9px] font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded-full z-10"
                    title="Reset Table"
                  >
                    Reset
                  </button>
                )}
                {table.linked_group_id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnlinkTable(table.linked_group_id); }}
                    className="absolute bottom-1 left-1 text-[9px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full z-10"
                    title="Unlink Table"
                  >
                    Unlink
                  </button>
                )}
              </div>
            );
          })}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
