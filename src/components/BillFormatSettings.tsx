import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Printer, Layout, FileText, CheckCircle, GripHorizontal, Trash2 } from 'lucide-react';

export function BillFormatSettings() {
  const [selectedFormat, setSelectedFormat] = useState('thermal-80');
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Custom template state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState([
    { id: '1', type: 'dynamic', label: 'Store Name', x: 20, y: 20, w: 200, h: 40 },
    { id: '2', type: 'dynamic', label: 'Date & Time', x: 250, y: 20, w: 120, h: 30 },
    { id: '3', type: 'dynamic', label: 'Items Table', x: 20, y: 80, w: 350, h: 100 },
    { id: '4', type: 'dynamic', label: 'Grand Total', x: 250, y: 200, w: 120, h: 40 },
  ]);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggingCanvasId, setDraggingCanvasId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const formats = [
    { id: 'a4', name: 'A4 Size', icon: <FileText size={24} />, desc: 'Standard A4 invoice' },
    { id: 'thermal-112', name: 'Thermal 112mm', icon: <Printer size={24} />, desc: 'Large receipt printer (4 inch)' },
    { id: 'thermal-80', name: 'Thermal 80mm', icon: <Printer size={24} />, desc: 'Standard receipt printer (3 inch)' },
    { id: 'thermal-58', name: 'Thermal 58mm', icon: <Printer size={24} />, desc: 'Compact receipt printer (2 inch)' },
    { id: 'custom', name: 'Custom Template', icon: <Layout size={24} />, desc: 'Drag & drop designer' }
  ];

  const availableElements = [
    { type: 'dynamic', label: 'Store Name' },
    { type: 'dynamic', label: 'Store Address' },
    { type: 'dynamic', label: 'Customer Name' },
    { type: 'dynamic', label: 'Customer Phone' },
    { type: 'dynamic', label: 'Date & Time' },
    { type: 'dynamic', label: 'Invoice Number' },
    { type: 'dynamic', label: 'Items Table' },
    { type: 'dynamic', label: 'Subtotal' },
    { type: 'dynamic', label: 'Tax Total' },
    { type: 'dynamic', label: 'Grand Total' },
    { type: 'text', label: 'Custom Text' },
    { type: 'image', label: 'Store Logo' },
    { type: 'divider', label: 'Divider Line' },
  ];

  const handleDragStartSidebar = (e: React.DragEvent, item: any) => {
    setDraggedItem({ ...item, source: 'sidebar' });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePointerDownCanvasItem = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    // Use setPointerCapture to keep tracking movement even outside the element
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!canvasRef.current) return;
    const el = elements.find(el => el.id === id);
    if (!el) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - el.x;
    const offsetY = e.clientY - rect.top - el.y;
    
    setDraggingCanvasId(id);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handlePointerMoveCanvasItem = (e: React.PointerEvent) => {
    if (!draggingCanvasId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position
    let x = e.clientX - rect.left - dragOffset.x;
    let y = e.clientY - rect.top - dragOffset.y;
    
    // Snap to grid (optional, say 10px grid)
    x = Math.round(x / 10) * 10;
    y = Math.round(y / 10) * 10;
    
    // Keep within bounds
    x = Math.max(0, x);
    y = Math.max(0, y);
    
    setElements(prev => prev.map(el => 
      el.id === draggingCanvasId ? { ...el, x, y } : el
    ));
  };

  const handlePointerUpCanvasItem = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingCanvasId(null);
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.source !== 'sidebar') return;
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
      
      setElements([
        ...elements, 
        { 
          id: Date.now().toString(), 
          type: draggedItem.type, 
          label: draggedItem.label, 
          x, 
          y,
          w: draggedItem.label === 'Items Table' ? 350 : 150,
          h: draggedItem.label === 'Items Table' ? 100 : 40
        }
      ]);
    }
    setDraggedItem(null);
  };

  const handleDragOverCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bill Print Format</CardTitle>
          <CardDescription>Select the default printing format for your invoices and receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {formats.map((format) => (
              <div 
                key={format.id}
                onClick={() => {
                  setSelectedFormat(format.id);
                  if (format.id === 'custom') {
                    setIsCustomizing(true);
                  } else {
                    setIsCustomizing(false);
                  }
                }}
                className={`relative border rounded-xl p-4 cursor-pointer transition-all ${selectedFormat === format.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                {selectedFormat === format.id && (
                  <div className="absolute top-3 right-3 text-primary">
                    <CheckCircle size={18} />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${selectedFormat === format.id ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {format.icon}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{format.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-tight">{format.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isCustomizing ? (
        <Card className="animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle>Custom Template Builder</CardTitle>
            <CardDescription>Drag elements from the sidebar to the canvas. Drag items on the canvas to position them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar */}
              <div className="w-full lg:w-64 shrink-0 space-y-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Elements</h4>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {availableElements.map(el => (
                    <div 
                      key={el.label} 
                      draggable
                      onDragStart={(e) => handleDragStartSidebar(e, el)}
                      className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 cursor-grab hover:border-primary/50 hover:shadow-sm transition-all flex items-center gap-2"
                    >
                      <GripHorizontal size={14} className="text-slate-400" />
                      {el.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 p-6 rounded-xl border border-slate-300 dark:border-slate-700 overflow-auto flex justify-center items-start min-h-[600px]">
                <div 
                  ref={canvasRef}
                  onDrop={handleDropOnCanvas}
                  onDragOver={handleDragOverCanvas}
                  className="relative bg-white dark:bg-slate-950 shadow-md border border-slate-200 dark:border-slate-800 w-full max-w-[400px] min-h-[600px] select-none"
                  style={{
                    backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                    backgroundSize: '10px 10px'
                  }}
                >
                  {elements.map(el => (
                    <div
                      key={el.id}
                      onPointerDown={(e) => handlePointerDownCanvasItem(e, el.id)}
                      onPointerMove={handlePointerMoveCanvasItem}
                      onPointerUp={handlePointerUpCanvasItem}
                      style={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.w,
                        height: el.h,
                        cursor: draggingCanvasId === el.id ? 'grabbing' : 'grab',
                        zIndex: draggingCanvasId === el.id ? 10 : 1,
                        touchAction: 'none' // Prevent scrolling on mobile while dragging
                      }}
                      className={`group border-2 rounded p-2 flex items-center justify-between text-sm transition-shadow ${
                        draggingCanvasId === el.id 
                          ? 'border-primary bg-primary/10 shadow-lg' 
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-primary/50 shadow-sm'
                      }`}
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300 pointer-events-none">{el.label}</span>
                      <button 
                        onPointerDown={(e) => { e.stopPropagation(); removeElement(el.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {elements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium p-8 text-center pointer-events-none">
                      Drag and drop elements here to build your custom bill template
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 gap-3">
               <button className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-sm transition-colors">
                 Reset Layout
               </button>
               <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors">
                 Save Template
               </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle>Preview: {formats.find(f => f.id === selectedFormat)?.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center bg-slate-50 dark:bg-slate-900 p-8 rounded-b-xl border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            {selectedFormat === 'thermal-112' && (
              <div className="bg-white dark:bg-slate-950 w-[112mm] min-h-[250px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-sm font-mono text-center">
                <div className="font-bold text-lg mb-1">STORE NAME</div>
                <div>123 Store Address, City, State ZIP</div>
                <div>Phone: 123-456-7890 | GSTIN: 27AAAAA0000A1Z5</div>
                <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-700 my-3"></div>
                <div className="flex justify-between mb-2 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="w-1/2 text-left">Description</span>
                  <span className="w-1/6 text-center">Qty</span>
                  <span className="w-1/6 text-right">Price</span>
                  <span className="w-1/6 text-right">Total</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="w-1/2 text-left truncate">Premium Product A</span>
                  <span className="w-1/6 text-center">1</span>
                  <span className="w-1/6 text-right">₹100</span>
                  <span className="w-1/6 text-right">₹100</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="w-1/2 text-left truncate">Standard Product B</span>
                  <span className="w-1/6 text-center">2</span>
                  <span className="w-1/6 text-right">₹100</span>
                  <span className="w-1/6 text-right">₹200</span>
                </div>
                <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-700 my-3"></div>
                <div className="flex justify-between font-bold text-base"><span>GRAND TOTAL</span><span>₹300</span></div>
                <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-700 my-3"></div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Thank you for your business!</div>
              </div>
            )}
            {selectedFormat === 'thermal-80' && (
              <div className="bg-white dark:bg-slate-950 w-[80mm] min-h-[200px] p-4 shadow-sm border border-slate-200 dark:border-slate-800 text-xs font-mono text-center">
                <div className="font-bold text-sm mb-1">STORE NAME</div>
                <div>123 Store Address, City</div>
                <div>Phone: 123-456-7890</div>
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
                <div className="flex justify-between mb-1"><span>Item</span><span>Amt</span></div>
                <div className="flex justify-between"><span>Product A x1</span><span>₹100</span></div>
                <div className="flex justify-between"><span>Product B x2</span><span>₹200</span></div>
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
                <div className="flex justify-between font-bold"><span>TOTAL</span><span>₹300</span></div>
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-2"></div>
                <div className="text-[10px]">Thank you for shopping!</div>
              </div>
            )}
            {selectedFormat === 'thermal-58' && (
              <div className="bg-white dark:bg-slate-950 w-[58mm] min-h-[150px] p-2 shadow-sm border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-center">
                <div className="font-bold text-xs mb-1">STORE NAME</div>
                <div>123 Address, City</div>
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1"></div>
                <div className="flex justify-between"><span>Prod A</span><span>₹100</span></div>
                <div className="flex justify-between"><span>Prod B</span><span>₹200</span></div>
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1"></div>
                <div className="flex justify-between font-bold"><span>TOTAL</span><span>₹300</span></div>
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1"></div>
                <div className="text-[8px]">Thank you!</div>
              </div>
            )}
            {selectedFormat === 'a4' && (
              <div className="bg-white dark:bg-slate-950 w-[210mm] min-h-[297px] p-8 shadow-sm border border-slate-200 dark:border-slate-800 text-sm">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">STORE NAME</h2>
                    <p className="text-slate-500 dark:text-slate-400">123 Store Address, City</p>
                    <p className="text-slate-500 dark:text-slate-400">Phone: 123-456-7890</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-light text-slate-400">INVOICE</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-slate-500 dark:text-slate-400">Inv #: INV-001</p>
                  </div>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <th className="py-3 font-semibold">Item Description</th>
                      <th className="py-3 font-semibold text-center">Qty</th>
                      <th className="py-3 font-semibold text-right">Price</th>
                      <th className="py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-300">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3">Premium Product A</td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3 text-right">₹100.00</td>
                      <td className="py-3 text-right">₹100.00</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3">Standard Product B</td>
                      <td className="py-3 text-center">2</td>
                      <td className="py-3 text-right">₹100.00</td>
                      <td className="py-3 text-right">₹200.00</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="flex justify-end mt-8">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>₹300.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Tax (18%)</span>
                      <span>₹54.00</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-800 pt-3">
                      <span>Total Amount</span>
                      <span>₹354.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
