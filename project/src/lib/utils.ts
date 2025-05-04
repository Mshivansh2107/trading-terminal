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
  
  // Filter transfers to skip 'ADJUSTMENT' platform transfers that shouldn't affect balance calculations
  const filteredTransfers = transfers.filter(t => t.from !== 'ADJUSTMENT' && t.to !== 'ADJUSTMENT');
  
  // For real platform calculations, include adjustment transfers separately
  const adjustmentTransfersIn = transfers.filter(t => t.from === 'ADJUSTMENT' && t.to === platform)
    .reduce((sum, t) => sum + t.quantity, 0);
    
  const adjustmentTransfersOut = transfers.filter(t => t.from === platform && t.to === 'ADJUSTMENT')
    .reduce((sum, t) => sum + t.quantity, 0);
  
  // Normal transfers between real platforms
  const transferredFrom = filteredTransfers.filter(t => t.from === platform)
    .reduce((sum, t) => sum + t.quantity, 0);
    
  const transferredTo = filteredTransfers.filter(t => t.to === platform)
    .reduce((sum, t) => sum + t.quantity, 0);
  
  return purchased - sold - transferredFrom + transferredTo + adjustmentTransfersIn - adjustmentTransfersOut;
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
    createdBy: sale.createdBy || '',
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
    createdBy: purchase.createdBy || '',
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
    createdBy: transfer.createdBy || '',
    editedBy: transfer.editedBy || '',
    updatedAt: transfer.updatedAt ? formatDateTime(new Date(transfer.updatedAt)) : ''
  }));

  // Combine all data
  return [...formattedSales, ...formattedPurchases, ...formattedTransfers];
}

/**
 * Calculate daily profit margin
 * 
 * Formula:
 * Profit Margin = (Sales Price Ratio) - (Purchase Price Ratio)
 * 
 * Where:
 * - Sales Price Ratio = sum(total price of sales) / sum(quantity of sales)
 * - Purchase Price Ratio = sum(total price of purchases) / sum(quantity of purchases)
 * 
 * @param salesForDay - Sales transactions for a specific day
 * @param purchasesForDay - Purchase transactions for a specific day
 * @returns The calculated profit margin as a percentage (or 0 if there's insufficient data)
 */
export function calculateDailyProfitMargin(
  salesForDay: Array<{totalPrice: number, price: number, quantity?: number}>,
  purchasesForDay: Array<{totalPrice: number, price: number, quantity?: number}>
): number {
  console.log('NPM Calculation - Input data:', {
    salesCount: salesForDay.length,
    purchasesCount: purchasesForDay.length,
    salesSample: salesForDay.slice(0, 3), // Log first 3 items as sample
    purchasesSample: purchasesForDay.slice(0, 3) // Log first 3 items as sample
  });

  // Handle edge case: no data
  if (salesForDay.length === 0 || purchasesForDay.length === 0) {
    console.log('NPM Calculation - No data for sales or purchases, returning 0');
    return 0;
  }

  // Calculate sales ratio using quantity
  const totalSalesPrice = salesForDay.reduce((sum, sale) => {
    // Handle invalid data
    if (isNaN(sale.totalPrice)) {
      console.warn('NPM Calculation - Invalid sale data detected:', sale);
      return sum;
    }
    return sum + sale.totalPrice;
  }, 0);
  
  const totalSalesQuantity = salesForDay.reduce((sum, sale) => {
    // Use quantity if available, or calculate it from totalPrice/price if not
    const quantity = sale.quantity !== undefined ? sale.quantity : (sale.price > 0 ? sale.totalPrice / sale.price : 0);
    
    // Handle invalid data
    if (isNaN(quantity)) {
      console.warn('NPM Calculation - Invalid sale quantity:', sale);
      return sum;
    }
    return sum + quantity;
  }, 0);
  
  // Calculate purchase ratio using quantity
  const totalPurchasePrice = purchasesForDay.reduce((sum, purchase) => {
    // Handle invalid data
    if (isNaN(purchase.totalPrice)) {
      console.warn('NPM Calculation - Invalid purchase data detected:', purchase);
      return sum;
    }
    return sum + purchase.totalPrice;
  }, 0);
  
  const totalPurchaseQuantity = purchasesForDay.reduce((sum, purchase) => {
    // Use quantity if available, or calculate it from totalPrice/price if not
    const quantity = purchase.quantity !== undefined ? purchase.quantity : (purchase.price > 0 ? purchase.totalPrice / purchase.price : 0);
    
    // Handle invalid data
    if (isNaN(quantity)) {
      console.warn('NPM Calculation - Invalid purchase quantity:', purchase);
      return sum;
    }
    return sum + quantity;
  }, 0);
  
  console.log('NPM Calculation - Intermediate values:', {
    totalSalesPrice,
    totalSalesQuantity,
    totalPurchasePrice,
    totalPurchaseQuantity
  });
  
  // If we don't have sufficient data, return 0
  if (totalSalesQuantity <= 0 || totalPurchaseQuantity <= 0) {
    console.log('NPM Calculation - Insufficient data (division by zero), returning 0');
    return 0;
  }
  
  // Calculate the ratios
  const salesRatio = totalSalesPrice / totalSalesQuantity;
  const purchaseRatio = totalPurchasePrice / totalPurchaseQuantity;
  
  console.log('NPM Calculation - Ratios:', {
    salesRatio,
    purchaseRatio
  });
  
  // Calculate profit margin and convert to percentage
  const profitMargin = (salesRatio - purchaseRatio);
  
  // Handle extreme values
  if (isNaN(profitMargin) || !isFinite(profitMargin)) {
    console.log('NPM Calculation - Invalid profit margin result, returning 0');
    return 0;
  }
  
  console.log('NPM Calculation - Final result:', {
    profitMargin: profitMargin,
    formattedProfitMargin: parseFloat(profitMargin.toFixed(2))
  });
  
  // Return the result with 2 decimal places
  return parseFloat(profitMargin.toFixed(2));
}
