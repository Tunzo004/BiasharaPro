import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownToLine, BarChart3, Boxes, ChevronDown, CreditCard, FileText, LayoutDashboard, LogOut, Plus, Receipt, Settings, ShoppingCart, Trash2, TrendingUp, Truck } from 'lucide-react';
import type { Product, PurchaseItem, PurchaseRecord, SaleItem, SaleRecord } from './types';
import { isSupabaseConfigured } from './lib/supabase';

const money = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });
const today = new Date().toISOString().slice(0, 10);
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialProducts: Product[] = [
  { id: 'p1', name: 'Sugar 5kg', code: 'SUG-001', category: 'Groceries', unitCost: 520, unitPrice: 650, openingStock: 50, currentStock: 42, lowStockThreshold: 10 },
  { id: 'p2', name: 'Rice 5kg', code: 'RIC-002', category: 'Groceries', unitCost: 690, unitPrice: 850, openingStock: 40, currentStock: 31, lowStockThreshold: 12 },
  { id: 'p3', name: 'Toothpaste', code: 'TOO-003', category: 'Personal care', unitCost: 180, unitPrice: 260, openingStock: 60, currentStock: 8, lowStockThreshold: 12 },
];

const initialSales: SaleRecord[] = [
  { id: 's1', sellerName: 'Grace M.', date: today, total: 1950, notes: 'Walk-in sales', items: [{ id: 'si1', productId: 'p1', productName: 'Sugar 5kg', code: 'SUG-001', quantity: 3, unitPrice: 650, total: 1950, sellerName: 'Grace M.', notes: '', date: today }] },
];

const initialPurchases: PurchaseRecord[] = [];
const newSaleRow = (product?: Product): SaleItem => ({
  id: makeId(), productId: product?.id ?? '', productName: product?.name ?? '', code: product?.code ?? '',
  quantity: 1, unitPrice: product?.unitPrice ?? 0, total: product?.unitPrice ?? 0,
  sellerName: 'Demo user', notes: '', date: today,
});
const newPurchaseRow = (): PurchaseItem => ({
  id: makeId(), productName: '', quantity: 1, unitCost: 0, total: 0, notes: '', date: today, supplierName: '',
});

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Sales', icon: ShoppingCart },
  { label: 'Purchases', icon: Truck },
  { label: 'Inventory', icon: Boxes },
  { label: 'Reports', icon: FileText },
  { label: 'Settings', icon: Settings },
] as const;
type Tab = (typeof navigation)[number]['label'];

export default function App() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(initialPurchases);
  const [saleRows, setSaleRows] = useState<SaleItem[]>([newSaleRow(initialProducts[0])]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseItem[]>([newPurchaseRow()]);
  const [notice, setNotice] = useState('');

  const totalSales = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const totalPurchases = useMemo(() => purchases.reduce((sum, purchase) => sum + purchase.total, 0), [purchases]);
  const stockAlertCount = products.filter((product) => product.currentStock <= product.lowStockThreshold).length;
  const saleTotal = saleRows.reduce((sum, row) => sum + row.total, 0);
  const purchaseTotal = purchaseRows.reduce((sum, row) => sum + row.total, 0);
  const salesChart = useMemo(() => sales.slice(0, 7).reverse().map((sale) => ({ day: sale.date.slice(5), amount: sale.total })), [sales]);

  const updateSale = (id: string, key: keyof SaleItem, value: string | number) => {
    setSaleRows((rows) => rows.map((row) => {
      if (row.id !== id) return row;
      if (key === 'productId') {
        const product = products.find((item) => item.id === value);
        if (!product) return { ...row, productId: '', productName: '', code: '', unitPrice: 0, total: 0 };
        return { ...row, productId: product.id, productName: product.name, code: product.code, unitPrice: product.unitPrice, total: product.unitPrice * row.quantity };
      }
      const next = { ...row, [key]: value } as SaleItem;
      if (key === 'quantity' || key === 'unitPrice') next.total = Number(next.quantity) * Number(next.unitPrice);
      return next;
    }));
  };

  const saveSales = () => {
    if (!saleRows.length || saleRows.some((row) => !row.productId || row.quantity < 1 || !Number.isInteger(row.quantity))) {
      setNotice('Chagua bidhaa na kiasi halali kwa kila mstari.');
      return;
    }
    const insufficient = saleRows.find((row) => (products.find((product) => product.id === row.productId)?.currentStock ?? 0) < row.quantity);
    if (insufficient) {
      setNotice(`Stock haitoshi: ${insufficient.productName}.`);
      return;
    }
    const record: SaleRecord = { id: makeId(), sellerName: 'Demo user', date: today, total: saleTotal, notes: 'Sales sheet entry', items: saleRows };
    setSales((previous) => [record, ...previous]);
    setProducts((previous) => previous.map((product) => {
      const sold = saleRows.filter((row) => row.productId === product.id).reduce((sum, row) => sum + row.quantity, 0);
      return sold ? { ...product, currentStock: product.currentStock - sold } : product;
    }));
    setSaleRows([newSaleRow(initialProducts[0])]);
    setNotice('Mauzo yameongezwa. Kwenye demo data imehifadhiwa kwenye session ya browser pekee.');
  };

  const updatePurchase = (id: string, key: keyof PurchaseItem, value: string | number) => {
    setPurchaseRows((rows) => rows.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [key]: value } as PurchaseItem;
      if (key === 'quantity' || key === 'unitCost') next.total = Number(next.quantity) * Number(next.unitCost);
      return next;
    }));
  };

  const savePurchases = () => {
    if (!purchaseRows.length || purchaseRows.some((row) => !row.productName.trim() || row.quantity < 1)) {
      setNotice('Jaza jina la bidhaa na kiasi halali kwa kila mstari.');
      return;
    }
    const record: PurchaseRecord = { id: makeId(), supplierName: purchaseRows[0].supplierName || 'Supplier', date: today, total: purchaseTotal, notes: 'Purchase sheet entry', items: purchaseRows };
    setPurchases((previous) => [record, ...previous]);
    setProducts((previous) => previous.map((product) => {
      const received = purchaseRows.filter((row) => row.productName.toLowerCase() === product.name.toLowerCase()).reduce((sum, row) => sum + row.quantity, 0);
      return received ? { ...product, currentStock: product.currentStock + received } : product;
    }));
    setPurchaseRows([newPurchaseRow()]);
    setNotice('Ununuzi umeongezwa. Kwenye demo data imehifadhiwa kwenye session ya browser pekee.');
  };

  const card = 'liquid-card rounded-3xl p-5 sm:p-6';
  const field = 'sheet-input w-full rounded-lg px-3 py-2.5 text-sm';

  return (
    <div className="min-h-screen text-slate-800">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-2xl sm:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="brand-mark">B</div><div><h1 className="text-lg font-bold tracking-tight text-[#102b55] sm:text-xl">BiasharaPro</h1><p className="text-xs text-slate-500">Business management</p></div></div>
          <div className="flex items-center gap-2"><span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 sm:inline-flex">OWNER · DEMO</span><button onClick={() => setNotice('Demo logout: Supabase Auth bado haijaunganishwa.')} className="icon-button" aria-label="Logout"><LogOut size={17}/></button></div>
        </div>
      </header>

      <div className="relative z-[1] mx-auto max-w-[1500px] px-4 py-5 sm:px-7 sm:py-7">
        {!isSupabaseConfigured && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">Demo mode: data bado haihifadhiwi kwenye Supabase/cloud.</div>}
        {notice && <div role="status" className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}<button className="ml-3 font-semibold underline" onClick={() => setNotice('')}>Funga</button></div>}

        <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className={`${card} sticky top-[86px] !p-3`}>
            <div className="mb-3 px-3 pt-2 text-[11px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</div>
            <nav className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setTab(label)} className={`nav-item ${tab === label ? 'nav-item-active' : ''}`}><Icon size={17}/><span>{label}</span></button>)}
            </nav>
            <div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/80 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-500">Business</p><p className="mt-1 font-semibold text-[#102b55]">My Business</p><p className="text-xs text-slate-500">Demo workspace</p></div>
          </aside>

          <main className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1"><div><p className="text-sm font-medium text-slate-500">{new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#102b55] sm:text-3xl">{tab}</h2></div><button className="secondary-button" onClick={() => setNotice('Taarifa ya sasa imeandaliwa kwa demo.') }><ArrowDownToLine size={16}/> Export</button></div>

            {tab === 'Overview' && <>
              <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {[
                  { title: 'Total sales', value: money.format(totalSales), icon: CreditCard, tint: 'metric-blue' },
                  { title: 'Products', value: String(products.length), icon: Boxes, tint: 'metric-cyan' },
                  { title: 'Low stock', value: String(stockAlertCount), icon: BarChart3, tint: 'metric-amber' },
                  { title: 'Purchases', value: money.format(totalPurchases), icon: TrendingUp, tint: 'metric-violet' },
                ].map(({ title, value, icon: Icon, tint }) => <article key={title} className={`${card} metric-card`}><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{title}</span><span className={`metric-icon ${tint}`}><Icon size={18}/></span></div><p className="mt-5 text-2xl font-bold text-[#102b55]">{value}</p><p className="mt-1 text-xs text-slate-400">Business summary</p></article>)}
              </section>
              <section className="grid gap-5 xl:grid-cols-2">
                <article className={card}><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-[#102b55]">Sales performance</h3><p className="text-xs text-slate-500">Recent transactions</p></div><span className="chart-badge">Live view</span></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={salesChart}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#e7edf7" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8290a6', fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8290a6', fontSize: 12 }}/><Tooltip/><Area dataKey="amount" stroke="#2563eb" strokeWidth={3} fill="url(#salesFill)"/></AreaChart></ResponsiveContainer></div></article>
                <article className={card}><div className="mb-4"><h3 className="font-bold text-[#102b55]">Stock overview</h3><p className="text-xs text-slate-500">Current units by product</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={products}><CartesianGrid stroke="#e7edf7" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8290a6', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8290a6', fontSize: 12 }}/><Tooltip/><Bar dataKey="currentStock" fill="#234a7c" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></article>
              </section>
              <section className={card}><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-[#102b55]">Low-stock alerts</h3><p className="text-xs text-slate-500">Products that may need restocking</p></div><button className="text-sm font-semibold text-blue-700" onClick={() => setTab('Inventory')}>View inventory</button></div><div className="grid gap-3 sm:grid-cols-2">{products.filter((product) => product.currentStock <= product.lowStockThreshold).map((product) => <div key={product.id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/70 p-3"><div><p className="font-semibold text-[#102b55]">{product.name}</p><p className="text-xs text-slate-500">{product.code}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{product.currentStock} left</span></div>)}</div></section>
            </>}

            {tab === 'Sales' && <section className={`${card} sheet-card`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Receipt size={19} className="text-blue-700"/><h3 className="text-lg font-bold text-[#102b55]">Sales entry sheet</h3></div><p className="mt-1 text-sm text-slate-500">Ingiza mauzo kwa mistari kama Excel; jumla huhesabiwa yenyewe.</p></div><button onClick={() => setSaleRows((rows) => [...rows, newSaleRow()])} className="primary-button"><Plus size={16}/> Add row</button></div>
              <div className="sheet-wrap"><table className="spreadsheet"><thead><tr><th className="row-number">#</th><th>Product</th><th>Code</th><th>Quantity</th><th>Unit price (KES)</th><th>Total (KES)</th><th>Notes</th><th></th></tr></thead><tbody>
                {saleRows.map((row, index) => <tr key={row.id}><td className="row-number">{index + 1}</td><td><div className="select-wrap"><select className={field} value={row.productId} onChange={(event) => updateSale(row.id, 'productId', event.target.value)}><option value="">Chagua bidhaa...</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><ChevronDown size={14}/></div></td><td><input className={field} value={row.code} readOnly placeholder="Code"/></td><td><input className={`${field} numeric-field`} type="number" min="1" value={row.quantity} onChange={(event) => updateSale(row.id, 'quantity', Number(event.target.value))}/></td><td><input className={`${field} numeric-field`} type="number" min="0" value={row.unitPrice} onChange={(event) => updateSale(row.id, 'unitPrice', Number(event.target.value))}/></td><td className="amount-cell">{money.format(row.total)}</td><td><input className={field} value={row.notes} onChange={(event) => updateSale(row.id, 'notes', event.target.value)} placeholder="Optional"/></td><td><button className="remove-button" aria-label="Remove row" onClick={() => setSaleRows((rows) => rows.length > 1 ? rows.filter((item) => item.id !== row.id) : rows)}><Trash2 size={16}/></button></td></tr>)}
              </tbody><tfoot><tr><td colSpan={5} className="total-label">Sale total</td><td className="total-value">{money.format(saleTotal)}</td><td colSpan={2}></td></tr></tfoot></table></div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{saleRows.length} spreadsheet row{saleRows.length === 1 ? '' : 's'}</span><button onClick={saveSales} className="primary-button"><Receipt size={16}/> Save sale</button></div>
              <div className="mt-7 border-t border-blue-100 pt-5"><h4 className="mb-3 font-bold text-[#102b55]">Recent sales</h4><div className="space-y-2">{sales.slice(0, 5).map((sale) => <div key={sale.id} className="flex justify-between gap-3 rounded-xl bg-blue-50/55 px-4 py-3 text-sm"><span className="text-slate-600">{sale.date} · {sale.sellerName}</span><strong className="text-[#102b55]">{money.format(sale.total)}</strong></div>)}</div></div>
            </section>}

            {tab === 'Purchases' && <section className={`${card} sheet-card`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Truck size={19} className="text-blue-700"/><h3 className="text-lg font-bold text-[#102b55]">Purchase entry sheet</h3></div><p className="mt-1 text-sm text-slate-500">Ingiza bidhaa ulizonunua kwa muundo wa spreadsheet.</p></div><button onClick={() => setPurchaseRows((rows) => [...rows, newPurchaseRow()])} className="primary-button"><Plus size={16}/> Add row</button></div>
              <div className="sheet-wrap"><table className="spreadsheet"><thead><tr><th className="row-number">#</th><th>Supplier</th><th>Product</th><th>Quantity</th><th>Unit cost (KES)</th><th>Total (KES)</th><th>Notes</th><th></th></tr></thead><tbody>
                {purchaseRows.map((row, index) => <tr key={row.id}><td className="row-number">{index + 1}</td><td><input className={field} value={row.supplierName} onChange={(event) => updatePurchase(row.id, 'supplierName', event.target.value)} placeholder="Supplier"/></td><td><input className={field} value={row.productName} onChange={(event) => updatePurchase(row.id, 'productName', event.target.value)} placeholder="Product name"/></td><td><input className={`${field} numeric-field`} type="number" min="1" value={row.quantity} onChange={(event) => updatePurchase(row.id, 'quantity', Number(event.target.value))}/></td><td><input className={`${field} numeric-field`} type="number" min="0" value={row.unitCost} onChange={(event) => updatePurchase(row.id, 'unitCost', Number(event.target.value))}/></td><td className="amount-cell">{money.format(row.total)}</td><td><input className={field} value={row.notes} onChange={(event) => updatePurchase(row.id, 'notes', event.target.value)} placeholder="Optional"/></td><td><button className="remove-button" aria-label="Remove row" onClick={() => setPurchaseRows((rows) => rows.length > 1 ? rows.filter((item) => item.id !== row.id) : rows)}><Trash2 size={16}/></button></td></tr>)}
              </tbody><tfoot><tr><td colSpan={5} className="total-label">Purchase total</td><td className="total-value">{money.format(purchaseTotal)}</td><td colSpan={2}></td></tr></tfoot></table></div>
              <div className="mt-5 flex justify-end"><button onClick={savePurchases} className="primary-button"><Plus size={16}/> Save purchase</button></div>
            </section>}

            {tab === 'Inventory' && <section className={`${card} overflow-hidden`}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-[#102b55]">Inventory</h3><p className="text-sm text-slate-500">Stock is updated by demo sales and purchases.</p></div><span className="chart-badge">{products.length} products</span></div><div className="sheet-wrap"><table className="spreadsheet"><thead><tr><th className="row-number">#</th><th>Product</th><th>Code</th><th>Category</th><th>Stock</th><th>Unit price</th><th>Status</th></tr></thead><tbody>{products.map((product, index) => <tr key={product.id}><td className="row-number">{index + 1}</td><td className="font-semibold text-[#102b55]">{product.name}</td><td>{product.code}</td><td>{product.category}</td><td className="numeric-field">{product.currentStock}</td><td>{money.format(product.unitPrice)}</td><td><span className={product.currentStock <= product.lowStockThreshold ? 'status-low' : 'status-ok'}>{product.currentStock <= product.lowStockThreshold ? 'Low stock' : 'In stock'}</span></td></tr>)}</tbody></table></div></section>}

            {tab === 'Reports' && <section className={card}><h3 className="font-bold text-[#102b55]">Reports</h3><div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="report-tile"><span>Total sales</span><strong>{money.format(totalSales)}</strong></div><div className="report-tile"><span>Total purchases</span><strong>{money.format(totalPurchases)}</strong></div><div className="report-tile"><span>Low stock items</span><strong>{stockAlertCount}</strong></div></div></section>}
            {tab === 'Settings' && <section className={card}><div className="flex items-center gap-2"><Settings size={19} className="text-blue-700"/><h3 className="font-bold text-[#102b55]">Settings</h3></div><p className="mt-2 text-sm text-slate-500">Supabase connection and business settings can be configured here in a future step.</p></section>}
          </main>
        </div>
        <footer className="mt-8 border-t border-blue-100/80 px-1 pt-4 text-xs text-slate-400">BiasharaPro · Liquid Glass workspace</footer>
      </div>
    </div>
  );
}
