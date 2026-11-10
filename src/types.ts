export type Role = 'owner' | 'seller';

export type Business = {
  name: string;
  businessId: string;
  industry: string;
  email: string;
  address: string;
  phone: string;
};

export type Product = {
  id: string;
  name: string;
  code: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  openingStock: number;
  currentStock: number;
  lowStockThreshold: number;
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  code: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sellerName: string;
  notes: string;
  date: string;
};

export type SaleRecord = {
  id: string;
  sellerName: string;
  date: string;
  total: number;
  notes: string;
  items: SaleItem[];
};

export type PurchaseItem = {
  id: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  notes: string;
  date: string;
  supplierName: string;
};

export type PurchaseRecord = {
  id: string;
  supplierName: string;
  date: string;
  total: number;
  notes: string;
  items: PurchaseItem[];
};

export type ExpenseRecord = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
};
