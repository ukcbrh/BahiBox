with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target1 = "  const [numGuests, setNumGuests] = useState(1);"
replace1 = "  const [numGuests, setNumGuests] = useState(1);\n  const [customerPhone, setCustomerPhone] = useState('');"

target2 = """            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">How many guests?</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setNumGuests(Math.max(1, numGuests - 1))} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Minus size={16} /></button>
              <span className="text-2xl font-extrabold w-10 text-center">{numGuests}</span>
              <button onClick={() => setNumGuests(numGuests + 1)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Plus size={16} /></button>
            </div>
            <Button className="w-full h-11" onClick={() => setStep('menu')}>View Menu</Button>"""

replace2 = """            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">How many guests?</p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => setNumGuests(Math.max(1, numGuests - 1))} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Minus size={16} /></button>
              <span className="text-2xl font-extrabold w-10 text-center">{numGuests}</span>
              <button onClick={() => setNumGuests(numGuests + 1)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Plus size={16} /></button>
            </div>
            <div className="mb-6 text-left">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Your mobile number</label>
              <Input required type="tel" placeholder="10-digit mobile number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <Button className="w-full h-11" disabled={customerPhone.length < 10} onClick={() => setStep('menu')}>View Menu</Button>"""

if target1 in content and target2 in content:
    content = content.replace(target1, replace1)
    content = content.replace(target2, replace2)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
