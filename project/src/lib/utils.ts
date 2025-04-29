import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 8,
    minimumFractionDigits: 2,
  }).format(quantity);
}

export function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm:ss a');
}

export function formatDateTime(date: Date): string {
  return format(date, 'dd/MM/yyyy h:mm:ss a');
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return timestamp + random;
}

export function calculateNetSales(sales: any[]): number {
  return sales.reduce((total, sale) => total + sale.totalPrice, 0);
}

export function calculateNetPurchases(purchases: any[]): number {
  return purchases.reduce((total, purchase) => total + purchase.totalPrice, 0);
}

export function calculateMargin(sales: number, purchases: number): number {
  if (purchases === 0) return 0;
  return parseFloat(((sales - purchases) / purchases * 100).toFixed(2));
}

export function calculatePlatformTotal(entries: any[], platform: string, type: 'quantity' | 'totalPrice'): number {
  return entries
    .filter(entry => entry.platform === platform)
    .reduce((total, entry) => total + entry[type], 0);
}

export function calculateBankTotal(entries: any[], bank: string): number {
  return entries
    .filter(entry => entry.bank === bank)
    .reduce((total, entry) => total + entry.totalPrice, 0);
}

export function calculateTransferTotal(transfers: any[], platform: string, type: 'from' | 'to'): number {
  return transfers
    .filter(transfer => transfer[type] === platform)
    .reduce((total, transfer) => total + transfer.quantity, 0);
}

export function calculateStockBalance(
  purchases: any[], 
  sales: any[], 
  transfers: any[], 
  platform: string
): number {
  const purchased = calculatePlatformTotal(purchases, platform, 'quantity');
  const sold = calculatePlatformTotal(sales, platform, 'quantity');
  const transferredFrom = calculateTransferTotal(transfers, platform, 'from');
  const transferredTo = calculateTransferTotal(transfers, platform, 'to');
  
  return purchased - sold - transferredFrom + transferredTo;
}

export function prepareExportData(sales: any[], purchases: any[], transfers: any[]) {
  // Format sales data
  const formattedSales = sales.map(sale => ({
    type: 'SALE',
    orderNumber: sale.orderNumber,
    bank: sale.bank,
    platform: sale.platform,
    totalPrice: sale.totalPrice,
    price: sale.price,
    quantity: sale.quantity,
    name: sale.name,
    contactNo: sale.contactNo || '',
    createdAt: formatDateTime(new Date(sale.createdAt)),
    editedBy: sale.editedBy || '',
    updatedAt: sale.updatedAt ? formatDateTime(new Date(sale.updatedAt)) : ''
  }));

  // Format purchase data
  const formattedPurchases = purchases.map(purchase => ({
    type: 'PURCHASE',
    orderNumber: purchase.orderNumber,
    bank: purchase.bank,
    platform: purchase.platform,
    totalPrice: purchase.totalPrice,
    price: purchase.price,
    quantity: purchase.quantity,
    name: purchase.name,
    contactNo: purchase.contactNo || '',
    createdAt: formatDateTime(new Date(purchase.createdAt)),
    editedBy: purchase.editedBy || '',
    updatedAt: purchase.updatedAt ? formatDateTime(new Date(purchase.updatedAt)) : ''
  }));

  // Format transfer data
  const formattedTransfers = transfers.map(transfer => ({
    type: 'TRANSFER',
    orderNumber: '-',
    bank: '-',
    platform: `${transfer.from} → ${transfer.to}`,
    totalPrice: '-',
    price: '-',
    quantity: transfer.quantity,
    name: '-',
    contactNo: '-',
    createdAt: formatDateTime(new Date(transfer.createdAt)),
    editedBy: transfer.editedBy || '',
    updatedAt: transfer.updatedAt ? formatDateTime(new Date(transfer.updatedAt)) : ''
  }));

  // Combine all data
  return [...formattedSales, ...formattedPurchases, ...formattedTransfers];
}