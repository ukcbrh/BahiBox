with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """          <Card className="shadow-sm">
            <CardContent className="p-0">
              <button onClick={() => setShowOrderDetails(!showOrderDetails)} className="w-full flex items-center justify-between p-4">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">View Order ({myOrders.length} round{myOrders.length > 1 ? 's' : ''})</span>
                <span className="text-xs text-slate-400">{showOrderDetails ? 'Hide' : 'Show'}</span>
              </button>"""

replace = """          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setShowOrderDetails(!showOrderDetails)}
            >
              View Order {showOrderDetails ? '▲' : '▼'}
            </Button>
            <Button variant="outline" className="h-11" onClick={() => { setStep('menu'); setCart([]); }}>Add More Items</Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">"""

if target in content:
    content = content.replace(target, replace)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
