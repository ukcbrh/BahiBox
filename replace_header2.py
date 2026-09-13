import re

with open('/app/applet/src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

new_header = """        {/* Header */}
        <header className="bg-white dark:bg-slate-900 px-4 pt-12 pb-4 shadow-sm z-10 sticky top-0 rounded-b-3xl">
          <div className="flex items-start justify-between mb-4 mt-2">
            <div className="flex items-start gap-2">
              <div className="text-orange-500 mt-1">
                <MapPin size={28} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">अपना बहराइच</h1>
                <div 
                  className="flex items-center text-blue-700 dark:text-blue-400 font-bold text-sm cursor-pointer mt-0.5"
                  onClick={handleUseCurrentLocation}
                >
                   {district || 'Set location'} <ChevronDown size={16} className="ml-1 stroke-[3]" />
                </div>
                <span className="text-slate-500 text-xs mt-0.5">Uttar Pradesh • Now</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="text-blue-700 dark:text-blue-400 hover:opacity-80">
                <Bell size={26} className="stroke-[2.5]" />
              </button>
              <div 
                className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-orange-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" 
                onClick={() => {
                  if (user) {
                    setActiveTab('profile');
                  } else {
                    setShowAuthGuard(true);
                  }
                }}
              >
                {user ? <span className="font-bold text-slate-800 dark:text-white">{userInitials}</span> : <UserIcon size={24} className="stroke-[2.5]" />}
              </div>
            </div>
          </div>
          
          <div className="relative mb-5">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-orange-500 stroke-[2.5]" />
            <Input 
              placeholder="Search for services, food, jobs..." 
              className="pl-10 pr-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-12 rounded-xl w-full shadow-sm text-[15px]"
            />
            <div className="absolute right-3 top-3.5 text-blue-500 cursor-pointer">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
          </div>

          <div className="w-full bg-gradient-to-r from-blue-700 to-orange-500 rounded-xl overflow-hidden relative shadow-md">
             <div className="p-4 flex flex-col justify-center relative z-10 w-2/3">
               <h2 className="text-white font-bold text-xl mb-1 drop-shadow-sm">अब Bahraich में सब कुछ</h2>
               <p className="text-white/95 text-[11px] font-medium drop-shadow-sm">One App for Ride • Food • Grocery • Jobs & More</p>
             </div>
             <div className="absolute right-0 bottom-0 h-full w-1/3 flex items-end justify-end overflow-hidden opacity-90">
                <svg viewBox="0 0 100 80" className="w-full h-full" preserveAspectRatio="xMaxYMax meet">
                  <rect x="50" y="30" width="15" height="40" fill="#ffffff" opacity="0.2" rx="2" />
                  <rect x="70" y="20" width="20" height="50" fill="#ffffff" opacity="0.3" rx="2" />
                  <rect x="30" y="40" width="15" height="30" fill="#ffffff" opacity="0.1" rx="2" />
                  <rect x="65" y="55" width="20" height="25" fill="#f97316" rx="2" />
                  <path d="M70 55 v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke="#f97316" strokeWidth="2" />
                  <path d="M30 65 L45 65 L50 55 L55 55 L55 75 L30 75 Z" fill="#2563eb" />
                  <circle cx="35" cy="75" r="5" fill="#1e293b" />
                  <circle cx="50" cy="75" r="5" fill="#1e293b" />
                  <rect x="42" y="48" width="12" height="10" fill="#f97316" />
                </svg>
             </div>
          </div>
        </header>"""

pattern = re.compile(r'\{\/\* Header \*\/\}.*?<\/header>', re.DOTALL)
if pattern.search(content):
    content = pattern.sub(new_header, content)
    with open('/app/applet/src/pages/PublicApp.tsx', 'w') as f:
        f.write(content)
    print("Header replaced successfully.")
else:
    print("Header block not found.")
