sed -i '/{isAddingTable && (/i \
      {qrTable && (\
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">\
          <Card className="w-full max-w-xs shadow-xl">\
            <CardHeader className="flex flex-row items-center justify-between pb-2">\
              <CardTitle>Table {qrTable.table_number} QR</CardTitle>\
              <Button variant="ghost" size="icon" onClick={() => setQrTable(null)}><X size={16} /></Button>\
            </CardHeader>\
            <CardContent className="text-center space-y-4">\
              <div className="bg-white p-4 rounded-xl inline-block">\
                <img\
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://www.bahibox.com/table-order?tenant_id=${currentTenantId}&table_id=${qrTable.id}`)}`}\
                  alt="Table QR Code"\
                  className="w-full"\
                />\
              </div>\
              <p className="text-xs text-slate-500 dark:text-slate-400">Print this and place it on Table {qrTable.table_number}. Guests scan to view menu and order.</p>\
              <Button variant="outline" className="w-full" onClick={() => window.print()}>Print QR</Button>\
            </CardContent>\
          </Card>\
        </div>\
      )}' src/components/hospitality/HospitalityComponents.tsx
