import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownToLine, BarChart3, Boxes, CreditCard, FileText, LayoutDashboard, LogOut, Plus, Receipt, Settings, ShoppingCart, Trash2, TrendingUp, Truck } from 'lucide-react';
import type { Product, PurchaseItem, PurchaseRecord, SaleItem, SaleRecord } from './types';
import { isSupabaseConfigured } from './lib/supabase';

const CURRENCIES = { TZS: { locale: 'en-TZ', code: 'TZS' }, KES: { locale: 'en-KE', code: 'KES' } } as const;
type CurrencyCode = keyof typeof CURRENCIES;
const today = new Date().toISOString().slice(0, 10);
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const initialProducts: Product[] = [
  { id: 'p1', name: 'Sugar 5kg', code: 'SUG-001', category: 'Groceries', unitCost: 520, unitPrice: 650, openingStock: 50, currentStock: 42, lowStockThreshold: 10 },
  { id: 'p2', name: 'Rice 5kg', code: 'RIC-002', category: 'Groceries', unitCost: 690, unitPrice: 850, openingStock: 40, currentStock: 31, lowStockThreshold: 12 },
  { id: 'p3', name: 'Toothpaste', code: 'TOO-003', category: 'Personal care', unitCost: 180, unitPrice: 260, openingStock: 60, currentStock: 8, lowStockThreshold: 12 },
];
const initialSales: SaleRecord[] = [{ id: 's1', sellerName: 'Grace M.', date: today, total: 1950, notes: 'Walk-in sales', items: [{ id: 'si1', productId: 'p1', productName: 'Sugar 5kg', code: 'SUG-001', quantity: 3, unitPrice: 650, total: 1950, sellerName: 'Grace M.', notes: '', date: today }] }];
const newSaleRow = (): SaleItem => ({ id: makeId(), productId: '', productName: '', code: '', quantity: 1, unitPrice: 0, total: 0, sellerName: 'Demo user', notes: '', date: today });
const newPurchaseRow = (): PurchaseItem => ({ id: makeId(), productName: '', quantity: 1, unitCost: 0, total: 0, notes: '', date: today, supplierName: '' });
const navigation = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Sales', icon: ShoppingCart }, { label: 'Purchases', icon: Truck },
  { label: 'Inventory', icon: Boxes }, { label: 'Reports', icon: FileText }, { label: 'Settings', icon: Settings },
] as const;
type Tab = (typeof navigation)[number]['label'];

export default function App() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [products, setProducts] = useState(initialProducts);
  const [sales, setSales] = useState(initialSales);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [saleRows, setSaleRows] = useState<SaleItem[]>([newSaleRow()]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseItem[]>([newPurchaseRow()]);
  const [notice, setNotice] = useState('');
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('TZS');
  const money = useMemo(() => new Intl.NumberFormat(CURRENCIES[currencyCode].locale, { style: 'currency', currency: CURRENCIES[currencyCode].code, maximumFractionDigits: 0 }), [currencyCode]);
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const lowStock = products.filter((p) => p.currentStock <= p.lowStockThreshold).length;
  const saleTotal = saleRows.reduce((sum, row) => sum + row.total, 0);
  const purchaseTotal = purchaseRows.reduce((sum, row) => sum + row.total, 0);
  const salesChart = sales.slice(0, 7).reverse().map((sale) => ({ day: sale.date.slice(5), amount: sale.total }));
  const card = 'liquid-card rounded-3xl p-5 sm:p-6';
  const field = 'sheet-input w-full rounded-lg px-3 py-2.5 text-sm';

  const updateSale = (id: string, key: keyof SaleItem, value: string | number) => setSaleRows((rows) => rows.map((row) => {
    if (row.id !== id) return row;
    if (key === 'productName') {
      const name = String(value);
      const product = products.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
      return { ...row, productName: name, productId: product?.id ?? '', code: product?.code ?? '', unitPrice: product?.unitPrice ?? 0, total: (product?.unitPrice ?? 0) * row.quantity };
    }
    const next = { ...row, [key]: value } as SaleItem;
    if (key === 'quantity' || key === 'unitPrice') next.total = Number(next.quantity) * Number(next.unitPrice);
    return next;
  }));

  const saveSales = () => {
    if (!saleRows.length || saleRows.some((row) => !row.productId || row.quantity < 1 || !Number.isInteger(row.quantity))) {
      setNotice('Enter a product name that matches an item in Inventory and a valid quantity.'); return;
    }
    const insufficient = saleRows.find((row) => (products.find((p) => p.id === row.productId)?.currentStock ?? 0) < row.quantity);
    if (insufficient) { setNotice(`Insufficient stock for: ${insufficient.productName}.`); return; }
    const record: SaleRecord = { id: makeId(), sellerName: 'Demo user', date: today, total: saleTotal, notes: 'Sales sheet entry', items: saleRows };
    setSales((previous) => [record, ...previous]);
    setProducts((previous) => previous.map((product) => {
      const sold = saleRows.filter((row) => row.productId === product.id).reduce((sum, row) => sum + row.quantity, 0);
      return sold ? { ...product, currentStock: product.currentStock - sold } : product;
    }));
    setSaleRows([newSaleRow()]); setNotice('Sale saved in demo mode. Data stays in this browser session only.');
  };

  const updatePurchase = (id: string, key: keyof PurchaseItem, value: string | number) => setPurchaseRows((rows) => rows.map((row) => {
    if (row.id !== id) return row;
    const next = { ...row, [key]: value } as PurchaseItem;
    if (key === 'quantity' || key === 'unitCost') next.total = Number(next.quantity) * Number(next.unitCost);
    return next;
  }));
  const savePurchases = () => {
    if (!purchaseRows.length || purchaseRows.some((row) => !row.productName.trim() || row.quantity < 1 || !Number.isInteger(row.quantity))) {
      setNotice('Enter a product name and valid quantity for each row.'); return;
    }
    const record: PurchaseRecord = { id: makeId(), supplierName: purchaseRows[0].supplierName || 'Supplier', date: today, total: purchaseTotal, notes: 'Purchase sheet entry', items: purchaseRows };
    setPurchases((previous) => [record, ...previous]);
    setProducts((previous) => previous.map((product) => {
      const received = purchaseRows.filter((row) => row.productName.trim().toLowerCase() === product.name.toLowerCase()).reduce((sum, row) => sum + row.quantity, 0);
      return received ? { ...product, currentStock: product.currentStock + received } : product;
    }));
    setPurchaseRows([newPurchaseRow()]); setNotice('Purchase saved in demo mode. Data stays in this browser session only.');
  };

  return <div className="min-h-screen text-slate-800">
    <div className="ambient ambient-one" aria-hidden="true"/><div className="ambient ambient-two" aria-hidden="true"/>
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-2xl sm:px-7"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="brand-mark">B</div><div><h1 className="text-lg font-bold text-[#102b55]">BiasharaPro</h1><p className="text-xs text-slate-500">Business management</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 sm:inline-flex">OWNER · DEMO</span><button onClick={() => setNotice('Demo logout: Supabase auth is not connected yet.')} className="icon-button" aria-label="Logout"><LogOut size={17}/></button></div></div></header>
    <div className="relative z-[1] mx-auto max-w-[1500px] px-4 py-5 sm:px-7 sm:py-7">
      {!isSupabaseConfigured && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">Demo mode: data is not being stored in Supabase yet.</div>}
      {notice && <div role="status" className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}<button className="ml-3 font-semibold underline" onClick={() => setNotice('')}>Close</button></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className={`${card} sticky top-[86px] !p-3`}><div className="mb-3 px-3 pt-2 text-[11px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</div><nav className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setTab(label)} className={`nav-item ${tab === label ? 'nav-item-active' : ''}`}><Icon size={17}/><span>{label}</span></button>)}</nav><div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/80 p-4"><p className="text-[10px] font-bold uppercase text-blue-500">Business</p><p className="mt-1 font-semibold text-[#102b55]">My Business</p><p className="text-xs text-slate-500">Demo workspace</p></div></aside>
        <main className="min-w-0 space-y-5"><div className="flex flex-wrap items-end justify-between gap-3 px-1"><div><p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h2 className="mt-1 text-2xl font-bold text-[#102b55]">{tab}</h2></div><button className="secondary-button" onClick={() => setNotice('Export is ready for your demo report.')}><ArrowDownToLine size={16}/> Export</button></div>
          {tab === 'Overview' && <><section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{[{ title: 'Total sales', value: money.format(totalSales), icon: CreditCard, tint: 'metric-blue' }, { title: 'Products', value: String(products.length), icon: Boxes, tint: 'metric-cyan' }, { title: 'Low stock', value: String(lowStock), icon: BarChart3, tint: 'metric-amber' }, { title: 'Purchases', value: money.format(totalPurchases), icon: TrendingUp, tint: 'metric-violet' }].map(({ title, value, icon: Icon, tint }) => <article key={title} className={`${card} metric-card`}><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{title}</span><span className={`metric-icon ${tint}`}><Icon size={18}/></span></div><p className="mt-5 text-2xl font-bold text-[#102b55]">{value}</p></article>)}</section><section className="grid gap-5 xl:grid-cols-2"><article className={card}><h3 className="mb-4 font-bold text-[#102b55]">Sales performance</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={salesChart}><CartesianGrid stroke="#e7edf7"/><XAxis dataKey="day"/><YAxis/><Tooltip/><Area dataKey="amount" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2}/></AreaChart></ResponsiveContainer></div></article><article className={card}><h3 className="mb-4 font-bold text-[#102b55]">Stock overview</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={products}><CartesianGrid stroke="#e7edf7"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="currentStock" fill="#234a7c"/></BarChart></ResponsiveContainer></div></article></section></>}
          {tab === 'Sales' && <section className={`${card} sheet-card`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Receipt size={19} className="text-blue-700"/><h3 className="text-lg font-bold text-[#102b55]">Sales entry sheet</h3></div><p className="mt-1 text-sm text-slate-500">Type the product name. Matching inventory products fill in the code and price.</p></div><button onClick={() => setSaleRows((rows) => [...rows, newSaleRow()])} className="primary-button"><Plus size={16}/> Add row</button></div><div className="sheet-wrap"><table className="spreadsheet"><thead><tr><th className="row-number">#</th><th>Product name</th><th>Code</th><th>Quantity</th><th>Unit price ({currencyCode === 'TZS' ? 'TSh' : 'KSh'})</th><th>Total</th><th>Notes</th><th/></tr></thead><tbody>{saleRows.map((row, index) => <tr key={row.id}><td className="row-number">{index + 1}</td><td><input className={field} value={row.productName} onChange={(event) => updateSale(row.id, 'productName', event.target.value)} placeholder="Type product name" list={`inventory-products-${row.id}`} /><datalist id={`inventory-products-${row.id}`}>{products.map((product) => <option key={product.id} value={product.name}/>)}</datalist></td><td><input className={field} value={row.code} readOnly placeholder="Auto-filled"/></td><td><input className={`${field} numeric-field`} type="number" min="1" value={row.quantity} onChange={(event) => updateSale(row.id, 'quantity', Number(event.target.value))}/></td><td><input className={`${field} numeric-field`} type="number" min="0" value={row.unitPrice} onChange={(event) => updateSale(row.id, 'unitPrice', Number(event.target.value))}/></td><td className="amount-cell">{money.format(row.total)}</td><td><input className={field} value={row.notes} onChange={(event) => updateSale(row.id, 'notes', event.target.value)} placeholder="Optional"/></td><td><button className="remove-button" aria-label="Remove row" onClick={() => setSaleRows((rows) => rows.length > 1 ? rows.filter((item) => item.id !== row.id) : rows)}><Trash2 size={16}/></button></td></tr>)}</tbody><tfoot><tr><td colSpan={5} className="total-label">Sale total</td><td className="total-value">{money.format(saleTotal)}</td><td colSpan={2}/></tr></tfoot></table></div><div className="mt-5 flex justify-end"><button onClick={saveSales} className="primary-button"><Receipt size={16}/> Save sale</button></div><div className="mt-7 border-t border-blue-100 pt-5"><h4 className="mb-3 font-bold text-[#102b55]">Recent sales</h4>{sales.slice(0, 5).map((sale) => <div key={sale.id} className="mb-2 flex justify-between rounded-xl bg-blue-50/55 px-4 py-3 text-sm"><span>{sale.date} · {sale.sellerName}</span><strong>{money.format(sale.total)}</strong></div>)}</div></section>}
          {tab === 'Purchases' && <section className={`${card} sheet-card`}><div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold text-[#102b55]">Purchase entry sheet</h3><p className="text-sm text-slate-500">Enter purchased stock in spreadsheet format.</p></div><button onClick={() => setPurchaseRows((rows) => [...rows, newPurchaseRow()])} className="primary-button"><Plus size={16}/> Add row</button></div><div className="sheet-wrap"><table className="spreadsheet"><thead><tr><th>#</th><th>Supplier</th><th>Product</th><th>Quantity</th><th>Unit cost</th><th>Total</th><th>Notes</th><th/></tr></thead><tbody>{purchaseRows.map((row, index) => <tr key={row.id}><td className="row-number">{index + 1}</td><td><input className={field} value={row.supplierName} onChange={(event) => updatePurchase(row.id, 'supplierName', event.target.value)} placeholder="Supplier"/></td><td><input className={field} value={row.productName} onChange={(event) => updatePurchase(row.id, 'productName', event.target.value)} placeholder="Product name"/></td><td><input className={`${field} numeric-field`} type="number" min="1" value={row.quantity} onChange={(event) => updatePurchase(row.id, 'quantity', Number(event.target.value))}/></td><td><input className={`${field} numeric-field`} type="number" min="0" value={row.unitCost} onChange={(event) => updatePurchase(row.id, 'unitCost', Number(event.target.value))}/></td><td className="amount-cell">{money.format(row.total)}</td><td><input className={field} value={row.notes} onChange={(event) => updatePurchase(row.id, 'notes', event.target.value)} placeholder="Optional"/></td><td><button className="remove-button" aria-label="Remove row" onClick={() => setPurchaseRows((rows) => rows.length > 1 ? rows.filter((item) => item.id !== row.id) : rows)}><Trash2 size={16}/></button></td></tr>)}</tbody><tfoot><tr><td colSpan={5} className="total-label">Purchase total</td><td className="total-value">{money.format(purchaseTotal)}</td><td colSpan={2}/></tr></tfoot></table></div><div className="mt-5 flex justify-end"><button onClick={savePurchases} className="primary-button">Save purchase</button></div></section>}
          {tab === 'Inventory' && <section className={`${card} overflow-hidden`}><h3 className="mb-4 font-bold text-[#102b55]">Inventory</h3><div className="sheet-wrap"><table className="spreadsheet"><thead><tr><th>#</th><th>Product</th><th>Code</th><th>Category</th><th>Stock</th><th>Unit price</th><th>Status</th></tr></thead><tbody>{products.map((product, index) => <tr key={product.id}><td className="row-number">{index + 1}</td><td>{product.name}</td><td>{product.code}</td><td>{product.category}</td><td>{product.currentStock}</td><td>{money.format(product.unitPrice)}</td><td><span className={product.currentStock <= product.lowStockThreshold ? 'status-low' : 'status-ok'}>{product.currentStock <= product.lowStockThreshold ? 'Low stock' : 'In stock'}</span></td></tr>)}</tbody></table></div></section>}
          {tab === 'Reports' && <section className={card}><h3 className="font-bold text-[#102b55]">Reports</h3><div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="report-tile"><span>Total sales</span><strong>{money.format(totalSales)}</strong></div><div className="report-tile"><span>Total purchases</span><strong>{money.format(totalPurchases)}</strong></div><div className="report-tile"><span>Low stock items</span><strong>{lowStock}</strong></div></div></section>}
          {tab === 'Settings' && <section className={card}><div className="flex items-center gap-2"><Settings size={19} className="text-blue-700"/><h3 className="font-bold text-[#102b55]">Settings</h3></div><label className="mt-5 block max-w-xs space-y-2"><span className="text-sm font-medium text-slate-600">Currency</span><select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value as CurrencyCode)} className={field}><option value="TZS">TSh</option><option value="KES">KSh</option></select></label><p className="mt-4 text-sm text-slate-500">Language: English</p></section>}
        </main>
      </div><footer className="mt-8 border-t border-blue-100/80 px-1 pt-4 text-xs text-slate-400">BiasharaPro · Liquid Glass workspace</footer>
    </div>
  </div>;
}
