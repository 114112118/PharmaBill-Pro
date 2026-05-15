/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  Settings as SettingsIcon, 
  Package, 
  Receipt, 
  Upload, 
  Edit2, 
  X,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Medicine, BillItem, Bill, PharmacySettings } from './types';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEYS = {
  INVENTORY: 'pharma_inventory',
  SETTINGS: 'pharma_settings',
  HISTORY: 'pharma_bill_history'
};

// --- Main App Component ---
export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'settings'>('billing');
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [settings, setSettings] = useState<PharmacySettings>({
    pharmacyName: 'My Pharmacy',
    address: '123 Health Street',
    phone: '+1 234 567 890',
  });
  
  // Billing State
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [customerName, setCustomerName] = useState('');
  
  // Inventory UI State
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');

  // Load Data
  useEffect(() => {
    const savedInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (savedInventory) setInventory(JSON.parse(savedInventory));

    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save Inventory
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  // Save Settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Derived Billing Data
  const subtotal = currentBillItems.reduce((acc, item) => acc + item.total, 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // --- Handlers ---
  const handleAddMedicine = (medicine: Omit<Medicine, 'id' | 'lastUpdated'>) => {
    const newMedicine: Medicine = {
      ...medicine,
      id: crypto.randomUUID(),
      lastUpdated: Date.now()
    };
    setInventory(prev => [newMedicine, ...prev]);
    setIsAddingMedicine(false);
  };

  const handleUpdateMedicine = (id: string, updates: Partial<Medicine>) => {
    setInventory(prev => prev.map(m => m.id === id ? { ...m, ...updates, lastUpdated: Date.now() } : m));
    setEditingMedicine(null);
  };

  const handleDeleteMedicine = (id: string) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      setInventory(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleAddItemToBill = (item: BillItem) => {
    setCurrentBillItems(prev => [...prev, item]);
  };

  const handleRemoveBillItem = (id: string) => {
    setCurrentBillItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetApp = () => {
    if (confirm('THIS WILL ERASE ALL DATA. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  // --- Render Helpers ---
  const filteredInventory = inventory.filter(m => 
    m.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - Navigation */}
      <nav className="no-print w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <Package size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800 truncate">
              {settings.pharmacyName}
            </h1>
          </div>
        </div>

        <div className="flex-1 px-4 space-y-1">
          <NavButton 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')}
            icon={<Receipt size={20} />}
            label="Billing"
          />
          <NavButton 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')}
            icon={<Package size={20} />}
            label="Inventory"
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={20} />}
            label="Settings"
          />
        </div>

        <div className="p-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-medium">PHARMABILL v1.0.0</p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 no-print overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'billing' && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">New Bill</h2>
                  <p className="text-slate-500">Create and print a customer invoice</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Date</p>
                  <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Adding Items */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                       <Plus size={18} className="text-emerald-600" />
                       Add Item
                    </h3>
                    <ItemSearch inventory={inventory} onAdd={handleAddItemToBill} />
                  </div>

                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                    <h3 className="font-semibold text-emerald-900">Customer Details</h3>
                    <input 
                      type="text" 
                      placeholder="Customer Name (Optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Right Side: Bill Table */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-semibold text-slate-800">Bill Items</h3>
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                        {currentBillItems.length} ITEMS
                      </span>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-3">Medicine</th>
                            <th className="px-6 py-3">Price</th>
                            <th className="px-6 py-3">Qty</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentBillItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-medium text-slate-800">{item.name}</p>
                                <p className="text-xs text-slate-400 uppercase">{item.priceType} price</p>
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-600">${item.price.toFixed(2)}</td>
                              <td className="px-6 py-4">{item.quantity}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-800">${item.total.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <button 
                                  onClick={() => handleRemoveBillItem(item.id)}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {currentBillItems.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-20 text-center">
                                <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium">No items added to bill yet</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Bill Footer Calculations */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Discount Type</label>
                          <select 
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="flat">Flat Amount ($)</option>
                          </select>
                        </div>
                        <div className="w-1/3">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Value</label>
                          <input 
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex gap-4 text-sm text-slate-500">
                            <span>Subtotal: ${subtotal.toFixed(2)}</span>
                            <span>Discount: -${discountAmount.toFixed(2)}</span>
                          </div>
                          <div className="text-3xl font-black text-slate-900">${totalAmount.toFixed(2)}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setCurrentBillItems([]);
                              setCustomerName('');
                              setDiscount(0);
                            }}
                            className="px-6 py-2 rounded-xl text-slate-500 font-semibold hover:bg-slate-200 transition-all"
                          >
                            Clear Bill
                          </button>
                          <button 
                            disabled={currentBillItems.length === 0}
                            onClick={handlePrint}
                            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:translate-y-0"
                          >
                            <Printer size={20} />
                            Print Bill
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Medicine Inventory</h2>
                  <p className="text-slate-500">Manage your medicine stock and prices</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <ExcelImporter onImport={(items) => setInventory(prev => [...items, ...prev])} />
                  <button 
                    onClick={() => setIsAddingMedicine(true)}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Medicine
                  </button>
                </div>
              </header>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search inventory by name..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Medicine Name</th>
                        <th className="px-6 py-4">Unit Price</th>
                        <th className="px-6 py-4">Box Price</th>
                        <th className="px-6 py-4">Last Updated</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                          <td className="px-6 py-4 font-mono">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 font-mono">${item.boxPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                             {new Date(item.lastUpdated).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 text-slate-400">
                              <button 
                                onClick={() => setEditingMedicine(item)}
                                className="p-2 hover:bg-white hover:text-blue-600 rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteMedicine(item.id)}
                                className="p-2 hover:bg-white hover:text-red-500 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredInventory.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <Package size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium">No medicines found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-900">App Settings</h2>
              
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" />
                    Pharmacy Identity
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <Field 
                      label="Pharmacy Name" 
                      value={settings.pharmacyName} 
                      onChange={(val) => setSettings(s => ({ ...s, pharmacyName: val }))} 
                    />
                    <Field 
                      label="Address" 
                      value={settings.address || ''} 
                      onChange={(val) => setSettings(s => ({ ...s, address: val }))} 
                    />
                    <Field 
                      label="Phone / Support" 
                      value={settings.phone || ''} 
                      onChange={(val) => setSettings(s => ({ ...s, phone: val }))} 
                    />
                    <Field 
                      label="Tax ID / License" 
                      value={settings.taxNumber || ''} 
                      onChange={(val) => setSettings(s => ({ ...s, taxNumber: val }))} 
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-4">
                    <AlertCircle size={18} />
                    Danger Zone
                  </h3>
                  <button 
                    onClick={handleResetApp}
                    className="w-full py-3 border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    Reset Application Data
                  </button>
                  <p className="mt-2 text-xs text-slate-400 text-center">
                    Warning: This will permanently delete all inventory and settings.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Modals & Overlays --- */}
      <AnimatePresence>
        {(isAddingMedicine || editingMedicine) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </h3>
                <button onClick={() => { setIsAddingMedicine(false); setEditingMedicine(null); }} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <MedicineForm 
                initial={editingMedicine || undefined} 
                onSubmit={(data) => {
                  if (editingMedicine) handleUpdateMedicine(editingMedicine.id, data);
                  else handleAddMedicine(data);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Print Overlay (Only visible when printing) --- */}
      <div className="print-only bg-white p-10 font-sans text-slate-900 overflow-visible">
        <header className="flex justify-between border-b-2 border-slate-800 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">{settings.pharmacyName}</h1>
            <p className="text-slate-600 mt-1">{settings.address}</p>
            <p className="text-slate-600">{settings.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Invoice</h2>
            <p className="mt-4 font-bold"># {Date.now().toString().slice(-6)}</p>
            <p className="text-slate-500">{new Date().toLocaleDateString()}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Billed To</p>
            <p className="text-xl font-bold">{customerName || 'Cash Customer'}</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-400 uppercase mb-2">License/Tax ID</p>
             <p className="font-mono text-sm">{settings.taxNumber || 'N/A'}</p>
          </div>
        </div>

        <table className="w-full text-left mb-8">
          <thead>
            <tr className="border-b-2 border-slate-800 text-sm font-bold uppercase">
              <th className="py-4">Description</th>
              <th className="py-4 text-center">Type</th>
              <th className="py-4 text-center">Qty</th>
              <th className="py-4 text-right">Price</th>
              <th className="py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {currentBillItems.map((item) => (
              <tr key={item.id} className="text-lg">
                <td className="py-4 font-semibold">{item.name}</td>
                <td className="py-4 text-center capitalize">{item.priceType}</td>
                <td className="py-4 text-center">{item.quantity}</td>
                <td className="py-4 text-right font-mono">${item.price.toFixed(2)}</td>
                <td className="py-4 text-right font-bold">${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-8 border-t-2 border-slate-800">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-slate-500">
              <span className="font-medium">Subtotal:</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span className="font-medium">Discount:</span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-3xl font-black pt-4 border-t border-slate-200">
              <span>Total:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <footer className="mt-20 text-center text-slate-400 italic">
          <p>Thank you for choosing {settings.pharmacyName}!</p>
          <p className="text-xs mt-2 font-not-italic opacity-50">This is a system generated bill.</p>
        </footer>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold group",
        active 
          ? "bg-emerald-50 text-emerald-700 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <span className={cn(
        "transition-colors",
        active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function ItemSearch({ inventory, onAdd }: { inventory: Medicine[], onAdd: (item: BillItem) => void }) {
  const [query, setQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [priceType, setPriceType] = useState<'unit' | 'box'>('unit');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => {
    if (!query) return [];
    return inventory.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [query, inventory]);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedMed) {
      setCustomPrice(priceType === 'unit' ? selectedMed.unitPrice.toString() : selectedMed.boxPrice.toString());
    }
  }, [priceType, selectedMed]);

  const handleAdd = () => {
    if (!selectedMed) return;
    const price = parseFloat(customPrice);
    if (isNaN(price)) return;

    onAdd({
      id: crypto.randomUUID(),
      medicineId: selectedMed.id,
      name: selectedMed.name,
      priceType,
      price,
      quantity,
      total: price * quantity
    });

    // Reset
    setQuery('');
    setSelectedMed(null);
    setQuantity(1);
  };

  return (
    <div className="space-y-4" ref={searchRef}>
      <div className="relative">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Search Medicine</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            placeholder="Type name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
          />
        </div>
        
        {showResults && results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
            {results.map(res => (
              <button 
                key={res.id}
                onClick={() => { setSelectedMed(res); setQuery(res.name); setShowResults(false); }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center group"
              >
                <span className="font-semibold text-slate-700 group-hover:text-emerald-700">{res.name}</span>
                <span className="text-xs text-slate-400 group-hover:text-slate-600 font-mono">${res.unitPrice.toFixed(2)} / unit</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMed && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 overflow-hidden pt-2"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price Basis</label>
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                 <button 
                  onClick={() => setPriceType('unit')}
                  className={cn("py-1 rounded-lg text-sm font-bold transition-all", priceType === 'unit' ? "bg-white shadow-sm text-emerald-700" : "text-slate-500")}
                 >Unit</button>
                 <button 
                  onClick={() => setPriceType('box')}
                  className={cn("py-1 rounded-lg text-sm font-bold transition-all", priceType === 'box' ? "bg-white shadow-sm text-emerald-700" : "text-slate-500")}
                 >Box</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price ($)</label>
              <input 
                type="number" 
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantity</label>
              <input 
                type="number" 
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <button 
            onClick={handleAdd}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg"
          >
            <Plus size={18} />
            Add to Bill
          </button>
        </motion.div>
      )}
    </div>
  );
}

function MedicineForm({ initial, onSubmit }: { initial?: Medicine, onSubmit: (data: any) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice?.toString() || '');
  const [boxPrice, setBoxPrice] = useState(initial?.boxPrice?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice || !boxPrice) return;
    onSubmit({
      name,
      unitPrice: parseFloat(unitPrice),
      boxPrice: parseFloat(boxPrice)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <Field label="Medicine Name" value={name} onChange={setName} placeholder="e.g. Paracetamol 500mg" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit Price ($)" value={unitPrice} type="number" onChange={setUnitPrice} placeholder="0.00" />
        <Field label="Box Price ($)" value={boxPrice} type="number" onChange={setBoxPrice} placeholder="0.00" />
      </div>
      <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 mt-4 hover:bg-emerald-700 transition-all">
        {initial ? 'Update Medicine' : 'Add to Inventory'}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-slate-400 uppercase">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800"
      />
    </div>
  );
}

function ExcelImporter({ onImport }: { onImport: (items: Medicine[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const cleanPrice = (val: any) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          // Remove any non-numeric characters except decimals
          const cleaned = val.toString().replace(/[^0-9.]/g, '');
          return parseFloat(cleaned) || 0;
        };

        const newItems: Medicine[] = data.map((row: any) => {
          // Normalize keys to find matches more easily
          const rowKeys = Object.keys(row);
          const findVal = (possibleNames: string[]) => {
            const match = rowKeys.find(k => 
              possibleNames.some(name => k.toLowerCase().replace(/[\s_]/g, '') === name.toLowerCase().replace(/[\s_]/g, ''))
            );
            return match ? row[match] : null;
          };

          return {
            id: crypto.randomUUID(),
            name: findVal(['Medicine Name', 'Name', 'Medicine', 'Item'])?.toString() || 'Unknown',
            unitPrice: cleanPrice(findVal(['Unit Price', 'Price', 'UnitPrice', 'Rate'])),
            boxPrice: cleanPrice(findVal(['Box Price', 'BoxPrice', 'Total Rate'])),
            lastUpdated: Date.now()
          };
        });

        onImport(newItems);
        alert(`Successfully imported ${newItems.length} items!`);
      } catch (err) {
        console.error(err);
        alert('Failed to parse Excel file. Ensure columns are "Medicine Name", "Unit Price", "Box Price".');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 flex items-center gap-2 transition-all"
      >
        <Upload size={18} />
        Import Excel
      </button>
    </>
  );
}
