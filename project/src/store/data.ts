import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { 
  SalesEntry, 
  PurchaseEntry, 
  TransferEntry,
  DashboardData,
  StatsData
} from '../types';
import { 
  calculateNetSales, 
  calculateNetPurchases, 
  calculateMargin,
  calculateStockBalance,
  calculateBankTotal
} from '../lib/utils';

// Initial data store
export const salesAtom = atomWithStorage<SalesEntry[]>('salesData', []);
export const purchasesAtom = atomWithStorage<PurchaseEntry[]>('purchasesData', []);
export const transfersAtom = atomWithStorage<TransferEntry[]>('transfersData', []);

// Computed data for dashboard
export const dashboardDataAtom = atom<DashboardData>((get) => {
  const sales = get(salesAtom);
  const purchases = get(purchasesAtom);
  const transfers = get(transfersAtom);
  
  const netSales = calculateNetSales(sales);
  const netPurchases = calculateNetPurchases(purchases);
  const currentMargin = calculateMargin(netSales, netPurchases);
  
  // Calculate stock balances
  const stockList = [
    { platform: 'BINANCE AS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'BINANCE AS') },
    { platform: 'BYBIT AS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'BYBIT AS') },
    { platform: 'BITGET AS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'BITGET AS') },
    { platform: 'KUCOIN AS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'KUCOIN AS') },
    { platform: 'BINANCE SS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'BINANCE SS') },
    { platform: 'BYBIT SS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'BYBIT SS') },
    { platform: 'BITGET SS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'BITGET SS') },
    { platform: 'KUCOIN SS' as const, quantity: calculateStockBalance(purchases, sales, transfers, 'KUCOIN SS') },
  ];
  
  // Calculate cash balances
  const cashList = [
    { bank: 'IDBI' as const, amount: 59235.12 },
    { bank: 'INDUSIND SS' as const, amount: 0 },
    { bank: 'HDFC CAA SS' as const, amount: 965 },
    { bank: 'BOB SS' as const, amount: 11737 },
    { bank: 'CANARA SS' as const, amount: 20000 },
    { bank: 'HDFC SS' as const, amount: 0 },
    { bank: 'INDUSIND BLYNK' as const, amount: 40000 },
    { bank: 'PNB' as const, amount: 0 },
  ];
  
  const totalCash = cashList.reduce((total, cash) => total + cash.amount, 0);
  const netCash = netSales - netPurchases;
  
  return {
    salesPriceRange: 92.8,
    totalCash,
    totalCashAlt: 17613.32,
    buyPriceRange: 88.80,
    buyPriceRangeAlt: 4.225,
    stockList,
    cashList,
    netSales,
    netPurchases,
    currentMargin,
    requiredMargin: 3,
    netCash,
    netCashAfterSales: netCash - 40965, // Example calculation
  };
});

// Computed data for stats
export const statsDataAtom = atom<StatsData>((get) => {
  const sales = get(salesAtom);
  const purchases = get(purchasesAtom);
  
  // Group sales by day
  const salesByDay = sales.reduce((acc: {date: string, amount: number}[], sale) => {
    const date = new Date(sale.createdAt).toLocaleDateString();
    const existingDate = acc.find(item => item.date === date);
    
    if (existingDate) {
      existingDate.amount += sale.totalPrice;
    } else {
      acc.push({ date, amount: sale.totalPrice });
    }
    
    return acc;
  }, []);
  
  // Calculate sales by bank
  const salesByBank = [
    { bank: 'IDBI' as const, amount: calculateBankTotal(sales, 'IDBI') },
    { bank: 'CANARA SS' as const, amount: calculateBankTotal(sales, 'CANARA SS') },
    { bank: 'BOB SS' as const, amount: calculateBankTotal(sales, 'BOB SS') },
    { bank: 'PNB' as const, amount: calculateBankTotal(sales, 'PNB') },
    { bank: 'INDUS BLYNK' as const, amount: calculateBankTotal(sales, 'INDUSIND BLYNK') },
    { bank: 'HDFC SS' as const, amount: calculateBankTotal(sales, 'HDFC SS') },
  ];
  
  // Calculate sales by platform
  const salesByPlatform = [
    { platform: 'BINANCE SS' as const, amount: calculateBankTotal(sales, 'BINANCE SS') },
    { platform: 'BINANCE AS' as const, amount: calculateBankTotal(sales, 'BINANCE AS') },
    { platform: 'BYBIT AS' as const, amount: calculateBankTotal(sales, 'BYBIT AS') },
    { platform: 'BITGET' as const, amount: calculateBankTotal(sales, 'BITGET') },
  ];
  
  // Calculate purchases by bank
  const purchasesByBank = [
    { bank: 'IDBI' as const, amount: calculateBankTotal(purchases, 'IDBI') },
    { bank: 'CANARA SS' as const, amount: calculateBankTotal(purchases, 'CANARA SS') },
    { bank: 'BOB SS' as const, amount: calculateBankTotal(purchases, 'BOB SS') },
    { bank: 'PNB' as const, amount: calculateBankTotal(purchases, 'PNB') },
    { bank: 'INDUS BLYNK' as const, amount: calculateBankTotal(purchases, 'INDUSIND BLYNK') },
    { bank: 'HDFC SS' as const, amount: calculateBankTotal(purchases, 'HDFC SS') },
  ];
  
  // Calculate purchases by platform
  const purchasesByPlatform = [
    { platform: 'BINANCE SS' as const, amount: calculateBankTotal(purchases, 'BINANCE SS') },
    { platform: 'BINANCE AS' as const, amount: calculateBankTotal(purchases, 'BINANCE AS') },
    { platform: 'BYBIT AS' as const, amount: calculateBankTotal(purchases, 'BYBIT AS') },
    { platform: 'BITGET' as const, amount: calculateBankTotal(purchases, 'BITGET') },
  ];
  
  // Cash distribution (from dashboard)
  const dashboardData = get(dashboardDataAtom);
  const cashDistribution = dashboardData.cashList;
  
  return {
    salesByDay,
    salesByBank,
    salesByPlatform,
    purchasesByBank,
    purchasesByPlatform,
    cashDistribution,
  };
});

// Actions
export const addSaleAtom = atom(
  null,
  (get, set, newSale: Omit<SalesEntry, 'id' | 'createdAt'>) => {
    const sales = get(salesAtom);
    const saleWithId = {
      ...newSale,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    set(salesAtom, [...sales, saleWithId as SalesEntry]);
  }
);

export const addPurchaseAtom = atom(
  null,
  (get, set, newPurchase: Omit<PurchaseEntry, 'id' | 'createdAt'>) => {
    const purchases = get(purchasesAtom);
    const purchaseWithId = {
      ...newPurchase,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    set(purchasesAtom, [...purchases, purchaseWithId as PurchaseEntry]);
  }
);

export const addTransferAtom = atom(
  null,
  (get, set, newTransfer: Omit<TransferEntry, 'id' | 'createdAt'>) => {
    const transfers = get(transfersAtom);
    const transferWithId = {
      ...newTransfer,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    set(transfersAtom, [...transfers, transferWithId as TransferEntry]);
  }
);

// Clear all data
export const clearDataAtom = atom(
  null,
  (_, set) => {
    set(salesAtom, []);
    set(purchasesAtom, []);
    set(transfersAtom, []);
  }
);