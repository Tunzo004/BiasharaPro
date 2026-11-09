import { useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Business, ExpenseRecord, Product, PurchaseItem, PurchaseRecord, Role, SaleItem, SaleRecord } from './types';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const APP_NAME = 'BiasharaPro';
const BUSINESS_ID_PREFIX = 'BP';
const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 2,
});

const defaultBusiness: Business = {
  name: 'BiasharaPro Demo',
  businessId: `${BUSINESS_ID_PREFIX}-001`,
  industry: 'Retail',
  email: 'hello@biasharapro.app',
  address: 'Nairobi, Kenya',
  phone: '+254700000000',
};

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Sugar 5kg', code: 'SUG-001', category: 'Groceries', unitCost: 520, unitPrice: 650, openingStock: 50, currentStock: 42, lowStockThreshold: 10 },
  { id: 'p2', name: 'Rice 5kg', code: 'RIC-002', category: 'Groceries', unitCost: 690, unitPrice: 850, openingStock: 40, currentStock: 31, lowStockThreshold: 12 },
  { id: 'p3', name: 'Toothpaste', code: 'TOO-003', category: 'Personal Care', unitCost: 180, unitPrice: 260, openingStock: 60, currentStock: 8, lowStockThreshold: 12 },
  { id: 'p4', name: 'Paint White', code: 'PNT-004', category: 'Hardware', unitCost: 900, unitPrice: 1200, openingStock: 20, currentStock: 18, lowStockThreshold: 5 },
];

const defaultSales: SaleRecord[] = [
  {
    id: 's1',
    sellerName: 'Grace M.',
    date: '2026-11-07',
    total: 3060,
    notes: 'Walk-in sales',
    items: [
      { id: 'si1', productId: 'p1', productName: 'Sugar 5kg', code: 'SUG-001', quantity: 3, unitPrice: 650, total: 1950, sellerName: 'Grace M.', notes: '', date: '2026-11-07' },
      { id: 'si2', productId: 'p3', productName: 'Toothpaste', code: 'TOO-003', quantity: 2, unitPrice: 260, total: 520, sellerName: 'Grace M.', notes: '', date: '2026-11-07' },
      { id: 'si3', productId: 'p2', productName: 'Rice 5kg', code: 'RIC-002', quantity: 2, unitPrice: 850, total: 1700, sellerName: 'Grace M.', notes: '', date: '2026-11-07' },
    ],
  },
  {
    id: 's2',
    sellerName: 'Daniel K.',
    date: '2026-11-08',
    total: 1890,
    notes: 'Rush order',
    items: [
      { id: 'si4', productId: 'p4', productName: 'Paint White', code: 'PNT-004', quantity: 1, unitPrice: 1200, total: 1200, sellerName: 'Daniel K.', notes: '', date: '2026-11-08' },
      { id: 'si5', productId: 'p3', productName: 'Toothpaste', code: 'TOO-003', quantity: 2, unitPrice: 260, total: 520, sellerName: 'Daniel K.', notes: '', date: '2026-11-08' },
      { id: 'si6', productId: 'p1', productName: 'Sugar 5kg', code: 'SUG-001', quantity: 1, unitPrice: 650, total: 650, sellerName: 'Daniel K.', notes: '', date: '2026-11-08' },
    ],
  },
];

const defaultPurchases: PurchaseRecord[] = [
  {
    id: 'p1',
    supplierName: 'Nairobi Distributors',
    date: '2026-11-05',
    total: 16000,
    notes: 'Weekly restock',
    items: [
      { id: 'pi1', productName: 'Sugar 5kg', quantity: 20, unitCost: 520, total: 10400, notes: '', date: '2026-11-05', supplierName: 'Nairobi Distributors' },
      { id: 'pi2', productName: 'Rice 5kg', quantity: 10, unitCost: 690, total: 6900, notes: '', date: '2026-11-05', supplierName: 'Nairobi Distributors' },
    ],
  },
];

const defaultExpenses: ExpenseRecord[] = [
  { id: 'e1', category: 'Rent', description: 'Shop rent', amount: 25000, date: '2026-11-06' },
  { id: 'e2', category: 'Utilities', description: 'Power and internet', amount: 7600, date: '2026-11-07' },
  { id: 'e3', category: 'Wages', description: 'Seller wages', amount: 18500, date: '2026-11-08' },
];

const emptySaleItem = (): SaleItem => ({
  id: crypto.randomUUID(),
  productId: '',
  productName: 'Product',
  code: '',
  quantity: 1,
  unitPrice: 0,
  total: 0,
  sellerName: 'Demo Seller',
  notes: '',
  date: new Date().toISOString().slice(0, 10),
});

const emptyPurchaseItem = (): PurchaseItem => ({
  id: crypto.randomUUID(),
  productName: 'Product',
  quantity: 1,
  unitCost: 0,
  total: 0,
  notes: '',
  date: new Date().toISOString().slice(0, 10),
  supplierName: 'Supplier',
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatMoney(value: number) {
  return currencyFormatter.format(value || 0);
}

function getStoredJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function AuthScreen({ onLogin }: { onLogin: (role: Role, email: string) => void }) {
  const [role, setRole] = useState<Role>('owner');
  const [email, setEmail] = useState('owner@biasharapro.app');
  const [password, setPassword] = useState('password123');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">B</div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{APP_NAME}</h1>
            <p className="text-sm text-slate-500">Business management platform</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-slate-600 dark:text-slate-300">
            Sign in as
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
              <option value="owner">Owner</option>
              <option value="seller">Seller</option>
            </select>
          </label>

          <label className="block text-sm text-slate-600 dark:text-slate-300">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800" />
          </label>

          <label className="block text-sm text-slate-600 dark:text-slate-300">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800" />
          </label>

          <button
            onClick={() => onLogin(role, email)}
            className="mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 font-medium text-white"
          >
            Continue to dashboard
          </button>

          {!isSupabaseConfigured && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Demo authentication is active. Add your Supabase keys to .env.local for real auth and cloud data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<{ email: string; name: string; role: Role } | null>({
    email: 'owner@biasharapro.app',
    name: 'Demo Owner',
    role: 'owner',
  });
  const [business, setBusiness] = useState<Business>(() => getStoredJSON<Business>('biasharapro.business', defaultBusiness));
  const [products, setProducts] = useState<Product[]>(() => getStoredJSON<Product[]>('biasharapro.products', defaultProducts));
  const [sales, setSales] = useState<SaleRecord[]>(() => getStoredJSON<SaleRecord[]>('biasharapro.sales', defaultSales));
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => getStoredJSON<PurchaseRecord[]>('biasharapro.purchases', defaultPurchases));
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => getStoredJSON<ExpenseRecord[]>('biasharapro.expenses', defaultExpenses));
  const [tab, setTab] = useState<'Overview' | 'Sales' | 'Purchases' | 'Inventory' | 'Reports' | 'Settings'>('Overview');
  const [saleRows, setSaleRows] = useState<SaleItem[]>([
    { ...emptySaleItem(), productName: 'Sugar 5kg', code: 'SUG-001', unitPrice: 650, total: 650 },
  ]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseItem[]>([
    { ...emptyPurchaseItem(), productName: 'Rice 5kg', unitCost: 690, total: 690 },
  ]);
  const [newExpense, setNewExpense] = useState({ category: 'Rent', description: 'Office maintenance', amount: 5000, date: new Date().toISOString().slice(0, 10) });
  const [searchText, setSearchText] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));

  const isAuthenticated = Boolean(session);

  const salesTotal = useMemo(() => sales.reduce((sum, record) => sum + record.total, 0), [sales]);
  const purchasesTotal = useMemo(() => purchases.reduce((sum, record) => sum + record.total, 0), [purchases]);
  const expensesTotal = useMemo(() => expenses.reduce((sum, entry) => sum + entry.amount, 0), [expenses]);
  const grossProfit = salesTotal - purchasesTotal;
  const netProfit = grossProfit - expensesTotal;
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.currentStock <= p.lowStockThreshold).length;

  const salesBySeller = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((record) => {
      map.set(record.sellerName, (map.get(record.sellerName) ?? 0) + record.total);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const bestSelling = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((record) => {
      record.items.forEach((item) => {
        map.set(item.productName, (map.get(item.productName) ?? 0) + item.quantity);
      });
    });
    return Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 4);
  }, [sales]);

  const dashboardChart = useMemo(() => {
    const points = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(new Date(), index - 6);
      return {
        day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
        sales: 0,
        purchases: 0,
      };
    });

    sales.forEach((record) => {
      const label = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(record.date));
      const found = points.find((point) => point.day === label);
      if (found) found.sales += record.total;
    });

    purchases.forEach((record) => {
      const label = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(record.date));
      const found = points.find((point) => point.day === label);
      if (found) found.purchases += record.total;
    });

    return points;
  }, [sales, purchases]);

  const inventoryChart = useMemo(() => {
    return products.map((product) => ({ name: product.name, stock: product.currentStock, value: product.unitPrice }));
  }, [products]);

  const filteredSales = useMemo(() => {
    return sales.filter((record) => {
      const matchesSearch = searchText.trim() === ''
        || record.notes.toLowerCase().includes(searchText.toLowerCase())
        || record.sellerName.toLowerCase().includes(searchText.toLowerCase());
      const matchesDate = !filterDate || record.date === filterDate;
      return matchesSearch && matchesDate;
    });
  }, [sales, searchText, filterDate]);

  const metricCards = [
    { title: 'Sales Today', value: formatMoney(sales.filter((sale) => sale.date === new Date().toISOString().slice(0, 10)).reduce((sum, sale) => sum + sale.total, 0)), icon: DollarSign, tone: 'bg-emerald-500/10 text-emerald-600' },
    { title: 'Sales This Week', value: formatMoney(sales.filter((sale) => new Date(sale.date) >= addDays(new Date(), -6)).reduce((sum, sale) => sum + sale.total, 0)), icon: TrendingUp, tone: 'bg-blue-500/10 text-blue-600' },
    { title: 'Sales This Month', value: formatMoney(sales.filter((sale) => new Date(sale.date).getMonth() === new Date().getMonth()).reduce((sum, sale) => sum + sale.total, 0)), icon: BarChart3, tone: 'bg-violet-500/10 text-violet-600' },
    { title: 'Net Profit', value: formatMoney(netProfit), icon: CreditCard, tone: 'bg-amber-500/10 text-amber-600' },
  ];

  const handleLogin = (role: Role, email: string) => {
    const username = role === 'owner' ? 'Demo Owner' : 'Demo Seller';
    setSession({ email, name: username, role });
  };

  const updateSaleRow = (id: string, field: keyof SaleItem, value: number | string) => {
    setSaleRows((rows) => rows.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value } as SaleItem;
      if (field === 'quantity' || field === 'unitPrice') {
        next.total = Number(next.quantity) * Number(next.unitPrice);
      }
      return next;
    }));
  };

  const updatePurchaseRow = (id: string, field: keyof PurchaseItem, value: number | string) => {
    setPurchaseRows((rows) => rows.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value } as PurchaseItem;
      if (field === 'quantity' || field === 'unitCost') {
        next.total = Number(next.quantity) * Number(next.unitCost);
      }
      return next;
    }));
  };

  const addSaleRow = () => setSaleRows((rows) => [...rows, { ...emptySaleItem(), productName: `Product ${rows.length + 1}` }]);
  const addPurchaseRow = () => setPurchaseRows((rows) => [...rows, { ...emptyPurchaseItem(), productName: `Item ${rows.length + 1}` }]);
  const removeSaleRow = (id: string) => setSaleRows((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));
  const removePurchaseRow = (id: string) => setPurchaseRows((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));

  const saveSale = () => {
    const transactionTotal = saleRows.reduce((sum, row) => sum + row.total, 0);
    const newRecord: SaleRecord = {
      id: crypto.randomUUID(),
      sellerName: session?.name ?? 'Demo Seller',
      date: new Date().toISOString().slice(0, 10),
      total: transactionTotal,
      notes: 'Sales entry recorded',
      items: saleRows.map((row) => ({ ...row, sellerName: session?.name ?? 'Demo Seller' })),
    };

    setSales((prev) => [newRecord, ...prev]);
    setProducts((prev) => prev.map((product) => {
      const match = saleRows.find((row) => row.productName.toLowerCase() === product.name.toLowerCase() || row.code === product.code);
      if (!match) return product;
      return { ...product, currentStock: Math.max(product.currentStock - match.quantity, 0) };
    }));
    setSaleRows([{ ...emptySaleItem(), productName: 'Sugar 5kg', code: 'SUG-001', unitPrice: 650, total: 650 }]);
  };

  const savePurchase = () => {
    const transactionTotal = purchaseRows.reduce((sum, row) => sum + row.total, 0);
    const purchaseRecord: PurchaseRecord = {
      id: crypto.randomUUID(),
      supplierName: purchaseRows[0]?.supplierName || 'Supplier',
      date: new Date().toISOString().slice(0, 10),
      total: transactionTotal,
      notes: 'Purchase received',
      items: purchaseRows.map((row) => ({ ...row })),
    };

    setPurchases((prev) => [purchaseRecord, ...prev]);
    setProducts((prev) => prev.map((product) => {
      const match = purchaseRows.find((row) => row.productName.toLowerCase() === product.name.toLowerCase());
      if (!match) return product;
      return { ...product, currentStock: product.currentStock + match.quantity };
    }));
    setPurchaseRows([{ ...emptyPurchaseItem(), productName: 'Rice 5kg', unitCost: 690, total: 690 }]);
  };

  const addExpense = () => {
    const entry: ExpenseRecord = {
      id: crypto.randomUUID(),
      category: newExpense.category,
      description: newExpense.description,
      amount: Number(newExpense.amount),
      date: newExpense.date,
    };
    setExpenses((prev) => [entry, ...prev]);
    setNewExpense({ category: 'Rent', description: 'Office maintenance', amount: 5000, date: new Date().toISOString().slice(0, 10) });
  };

  const exportCSV = () => {
    const headers = ['Date,Description,Amount'];
    const rows = expenses.map((entry) => `${entry.date},${entry.description},${entry.amount}`);
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'biasharapro-expenses.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => window.print();

  const navItems = ['Overview', 'Sales', 'Purchases', 'Inventory', 'Reports', 'Settings'] as const;

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ title, value, icon: Icon, tone }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
              <span className={`rounded-xl p-2 ${tone}`}><Icon size={18} /></span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</h3>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sales vs purchases</h4>
            <span className="text-sm text-slate-500">7-day view</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardChart}>
                <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatMoney(Number(value))} />
                <Area dataKey="sales" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.5} strokeWidth={3} />
                <Area dataKey="purchases" stroke="#10b981" fill="#86efac" fillOpacity={0.4} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sales by seller</h4>
            <Users size={18} className="text-slate-500" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesBySeller}>
                <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatMoney(Number(value))} />
                <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Best-selling products</h4>
          <div className="space-y-3">
            {bestSelling.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-50">{index + 1}. {item.name}</p>
                  <p className="text-xs text-slate-500">Units sold</p>
                </div>
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Profit summary</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span>Gross profit</span><strong>{formatMoney(grossProfit)}</strong></div>
            <div className="flex items-center justify-between"><span>Expenses</span><strong>{formatMoney(expensesTotal)}</strong></div>
            <div className="flex items-center justify-between"><span>Net profit</span><strong>{formatMoney(netProfit)}</strong></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Inventory overview</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span>Total products</span><strong>{totalProducts}</strong></div>
            <div className="flex items-center justify-between"><span>Low-stock count</span><strong>{lowStockCount}</strong></div>
            <div className="flex items-center justify-between"><span>Inventory value</span><strong>{formatMoney(products.reduce((sum, p) => sum + p.currentStock * p.unitCost, 0))}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sales entry</h3>
          <p className="text-sm text-slate-500">Excel-like multi-product sale capture</p>
        </div>
        <button onClick={saveSale} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-50 dark:text-slate-900">
          <Receipt size={16} /> Save sale
        </button>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Code</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Unit price</th>
              <th className="p-3">Total</th>
              <th className="p-3">Notes</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {saleRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-3"><input value={row.productName} onChange={(e) => updateSaleRow(row.id, 'productName', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><input value={row.code} onChange={(e) => updateSaleRow(row.id, 'code', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><input type="number" min={1} value={row.quantity} onChange={(e) => updateSaleRow(row.id, 'quantity', Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><input type="number" min={0} value={row.unitPrice} onChange={(e) => updateSaleRow(row.id, 'unitPrice', Number(e.target.value))} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3 font-medium">{formatMoney(row.total)}</td>
                <td className="p-3"><input value={row.notes} onChange={(e) => updateSaleRow(row.id, 'notes', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><button onClick={() => removeSaleRow(row.id)} className="text-red-500">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <button onClick={addSaleRow} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"><Plus size={15} /> Add row</button>
        <div className="text-lg font-semibold">Total: {formatMoney(saleRows.reduce((sum, row) => sum + row.total, 0))}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent sales</h4>
          <div className="flex gap-3">
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by notes or seller" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>
        <div className="space-y-3">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-3 md:flex-row md:items-center dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{sale.sellerName}</p>
                <p className="text-sm text-slate-500">{sale.date} • {sale.items.length} items</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(sale.total)}</p>
                <p className="text-xs text-slate-500">{sale.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPurchases = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Purchase entry</h3>
          <p className="text-sm text-slate-500">Track supplier purchases and receive inventory</p>
        </div>
        <button onClick={savePurchase} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          <Truck size={16} /> Save purchase
        </button>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="p-3">Supplier</th>
              <th className="p-3">Product</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Unit cost</th>
              <th className="p-3">Total</th>
              <th className="p-3">Notes</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {purchaseRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-3"><input value={row.supplierName} onChange={(e) => updatePurchaseRow(row.id, 'supplierName', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><input value={row.productName} onChange={(e) => updatePurchaseRow(row.id, 'productName', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><input type="number" min={1} value={row.quantity} onChange={(e) => updatePurchaseRow(row.id, 'quantity', Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><input type="number" min={0} value={row.unitCost} onChange={(e) => updatePurchaseRow(row.id, 'unitCost', Number(e.target.value))} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3 font-medium">{formatMoney(row.total)}</td>
                <td className="p-3"><input value={row.notes} onChange={(e) => updatePurchaseRow(row.id, 'notes', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="p-3"><button onClick={() => removePurchaseRow(row.id)} className="text-red-500">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <button onClick={addPurchaseRow} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"><Plus size={15} /> Add row</button>
        <div className="text-lg font-semibold">Total: {formatMoney(purchaseRows.reduce((sum, row) => sum + row.total, 0))}</div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Inventory management</h3>
            <p className="text-sm text-slate-500">Track opening stock, current stock, and low stock alerts</p>
          </div>
          <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">{lowStockCount} low stock</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Code</th>
                <th className="p-3">Category</th>
                <th className="p-3">Current stock</th>
                <th className="p-3">Selling price</th>
                <th className="p-3">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3">{product.code}</td>
                  <td className="p-3">{product.category}</td>
                  <td className={`p-3 font-semibold ${product.currentStock <= product.lowStockThreshold ? 'text-red-600' : 'text-emerald-600'}`}>{product.currentStock}</td>
                  <td className="p-3">{formatMoney(product.unitPrice)}</td>
                  <td className="p-3">{product.lowStockThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Product stock chart</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inventoryChart}>
              <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value}`} />
              <Bar dataKey="stock" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Reports</h3>
            <p className="text-sm text-slate-500">Daily, weekly, monthly, and profit & loss snapshots</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"><Download size={15} /> Excel</button>
            <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-100"><FileText size={15} /> PDF</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Daily sales', value: formatMoney(sales.filter((sale) => sale.date === new Date().toISOString().slice(0, 10)).reduce((sum, sale) => sum + sale.total, 0)) },
            { label: 'Weekly sales', value: formatMoney(sales.filter((sale) => new Date(sale.date) >= addDays(new Date(), -6)).reduce((sum, sale) => sum + sale.total, 0)) },
            { label: 'Purchases', value: formatMoney(purchasesTotal) },
            { label: 'Profit & loss', value: formatMoney(netProfit) },
          ].map((entry) => (
            <div key={entry.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500">{entry.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{entry.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Expense breakdown</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="amount" nameKey="category" data={expenses.map((entry) => ({ category: entry.category, amount: entry.amount }))} cx="50%" cy="50%" outerRadius={80} fill="#2563eb" label />
              <Tooltip formatter={(value: number) => formatMoney(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Business settings</h3>
        <div className="space-y-4">
          <label className="block text-sm text-slate-600 dark:text-slate-300">Business name
            <input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Business ID
            <input value={business.businessId} onChange={(e) => setBusiness({ ...business, businessId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Industry
            <select value={business.industry} onChange={(e) => setBusiness({ ...business, industry: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <option>Retail</option>
              <option>Supermarket</option>
              <option>Hardware</option>
              <option>Boutique</option>
              <option>Pharmacy</option>
              <option>Restaurant</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Expense tracking</h3>
        <div className="space-y-4">
          <label className="block text-sm text-slate-600 dark:text-slate-300">Category
            <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <option>Rent</option>
              <option>Utilities</option>
              <option>Wages</option>
              <option>Transport</option>
              <option>Marketing</option>
            </select>
          </label>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Description
            <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Amount
            <input type="number" min={0} value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Date
            <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <button onClick={addExpense} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"><Plus size={15} /> Add expense</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="no-print border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">B</div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{APP_NAME}</h1>
              <p className="text-xs text-slate-500">Multi-tenant commerce hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">{session?.role}</span>
            <button
              onClick={() => setSession(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-100"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Demo mode active: configure Supabase in .env.local to enable secure cloud authentication, database records, and real-time updates.
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 xl:flex-row">
        <aside className="no-print w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 xl:max-w-[250px]">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = {
                Overview: LayoutDashboard,
                Sales: ShoppingCart,
                Purchases: Truck,
                Inventory: Boxes,
                Reports: FileText,
                Settings: SettingsIcon,
              }[item];

              return (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${tab === item ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                  <Icon size={16} />
                  {item}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Business</p>
            <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{business.name}</h3>
            <p className="text-sm text-slate-500">{business.businessId}</p>
          </div>
        </aside>

        <main className="flex-1">
          {tab === 'Overview' && renderOverview()}
          {tab === 'Sales' && renderSales()}
          {tab === 'Purchases' && renderPurchases()}
          {tab === 'Inventory' && renderInventory()}
          {tab === 'Reports' && renderReports()}
          {tab === 'Settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
}

export default App;
