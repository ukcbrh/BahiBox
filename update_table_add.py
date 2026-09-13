with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target1 = "  const [qrTable, setQrTable] = useState<any>(null);"
replacement1 = "  const [qrTable, setQrTable] = useState<any>(null);\n  const [editingTable, setEditingTable] = useState<any>(null);"

target2 = """      {isAddingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>New Table</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsAddingTable(false)}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTable} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Table Number</label>
                  <Input required value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })} placeholder="E.g. T1, 12" />
                </div>
                <div>
                  <label className="text-sm font-medium">Dining Area (optional)</label>
                  <Input value={newTable.dining_area} onChange={(e) => setNewTable({ ...newTable, dining_area: e.target.value })} placeholder="E.g. Rooftop, Main Hall" />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <Input type="number" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddingTable(false)}>Cancel</Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 4. KDS"""

replacement2 = """      {isAddingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{editingTable ? 'Edit Table' : 'New Table'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsAddingTable(false); setEditingTable(null); setNewTable({ table_number: '', dining_area: '', capacity: '4' }); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTable} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Table Number</label>
                  <Input required value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })} placeholder="E.g. T1, 12" />
                </div>
                <div>
                  <label className="text-sm font-medium">Dining Area (optional)</label>
                  <Input value={newTable.dining_area} onChange={(e) => setNewTable({ ...newTable, dining_area: e.target.value })} placeholder="E.g. Rooftop, Main Hall" />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <Input type="number" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setIsAddingTable(false); setEditingTable(null); setNewTable({ table_number: '', dining_area: '', capacity: '4' }); }}>Cancel</Button>
                  <Button type="submit">{editingTable ? 'Save' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 4. KDS"""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1)
    content = content.replace(target2, replacement2)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target1 found:", target1 in content)
    print("Target2 found:", target2 in content)
