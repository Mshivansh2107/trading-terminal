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
import { supabase } from '../lib/supabase';
import { authAtom } from './auth';

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
    { bank: 'INDUSIND BLYNK' as const, amount: calculateBankTotal(sales, 'INDUSIND BLYNK') },
    { bank: 'HDFC SS' as const, amount: calculateBankTotal(sales, 'HDFC SS') },
  ];
  
  // Calculate sales by platform
  const salesByPlatform = [
    { platform: 'BINANCE SS' as const, amount: calculateBankTotal(sales, 'BINANCE SS') },
    { platform: 'BINANCE AS' as const, amount: calculateBankTotal(sales, 'BINANCE AS') },
    { platform: 'BYBIT AS' as const, amount: calculateBankTotal(sales, 'BYBIT AS') },
    { platform: 'BITGET SS' as const, amount: calculateBankTotal(sales, 'BITGET SS') },
  ];
  
  // Calculate purchases by bank
  const purchasesByBank = [
    { bank: 'IDBI' as const, amount: calculateBankTotal(purchases, 'IDBI') },
    { bank: 'CANARA SS' as const, amount: calculateBankTotal(purchases, 'CANARA SS') },
    { bank: 'BOB SS' as const, amount: calculateBankTotal(purchases, 'BOB SS') },
    { bank: 'PNB' as const, amount: calculateBankTotal(purchases, 'PNB') },
    { bank: 'INDUSIND BLYNK' as const, amount: calculateBankTotal(purchases, 'INDUSIND BLYNK') },
    { bank: 'HDFC SS' as const, amount: calculateBankTotal(purchases, 'HDFC SS') },
  ];
  
  // Calculate purchases by platform
  const purchasesByPlatform = [
    { platform: 'BINANCE SS' as const, amount: calculateBankTotal(purchases, 'BINANCE SS') },
    { platform: 'BINANCE AS' as const, amount: calculateBankTotal(purchases, 'BINANCE AS') },
    { platform: 'BYBIT AS' as const, amount: calculateBankTotal(purchases, 'BYBIT AS') },
    { platform: 'BITGET SS' as const, amount: calculateBankTotal(purchases, 'BITGET SS') },
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
  async (get, set, newSale: Omit<SalesEntry, 'id' | 'createdAt'>) => {
    const sales = get(salesAtom);
    const auth = get(authAtom);
    
    const saleWithId = {
      ...newSale,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    // Save to local storage via jotai
    set(salesAtom, [...sales, saleWithId as SalesEntry]);
    
    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert({
          id: saleWithId.id,
          order_number: saleWithId.orderNumber,
          bank: saleWithId.bank,
          order_type: saleWithId.orderType,
          asset_type: saleWithId.assetType,
          fiat_type: saleWithId.fiatType,
          total_price: saleWithId.totalPrice,
          price: saleWithId.price,
          quantity: saleWithId.quantity,
          platform: saleWithId.platform,
          name: saleWithId.name,
          contact_no: saleWithId.contactNo,
          created_at: saleWithId.createdAt.toISOString()
        });
      
      if (error) {
        console.error('Error saving to Supabase:', error);
      } else {
        console.log('Successfully saved to Supabase:', data);
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }
);

export const addPurchaseAtom = atom(
  null,
  async (get, set, newPurchase: Omit<PurchaseEntry, 'id' | 'createdAt'>) => {
    const purchases = get(purchasesAtom);
    const auth = get(authAtom);
    
    const purchaseWithId = {
      ...newPurchase,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    // Save to local storage via jotai
    set(purchasesAtom, [...purchases, purchaseWithId as PurchaseEntry]);
    
    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert({
          id: purchaseWithId.id,
          order_number: purchaseWithId.orderNumber,
          bank: purchaseWithId.bank,
          order_type: purchaseWithId.orderType,
          asset_type: purchaseWithId.assetType,
          fiat_type: purchaseWithId.fiatType,
          total_price: purchaseWithId.totalPrice,
          price: purchaseWithId.price,
          quantity: purchaseWithId.quantity,
          platform: purchaseWithId.platform,
          name: purchaseWithId.name,
          contact_no: purchaseWithId.contactNo,
          created_at: purchaseWithId.createdAt.toISOString()
        });
      
      if (error) {
        console.error('Error saving to Supabase:', error);
      } else {
        console.log('Successfully saved to Supabase:', data);
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }
);

export const addTransferAtom = atom(
  null,
  async (get, set, newTransfer: Omit<TransferEntry, 'id' | 'createdAt'>) => {
    const transfers = get(transfersAtom);
    const auth = get(authAtom);
    
    const transferWithId = {
      ...newTransfer,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    // Save to local storage via jotai
    set(transfersAtom, [...transfers, transferWithId as TransferEntry]);
    
    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from('transfers')
        .insert({
          id: transferWithId.id,
          from_platform: transferWithId.from,
          to_platform: transferWithId.to,
          quantity: transferWithId.quantity,
          created_at: transferWithId.createdAt.toISOString()
        });
      
      if (error) {
        console.error('Error saving to Supabase:', error);
      } else {
        console.log('Successfully saved to Supabase:', data);
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }
);

// Functions to load data from Supabase
export const loadSupabaseDataAtom = atom(
  null,
  async (_, set) => {
    try {
      // Load sales data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (salesError) {
        console.error('Error loading sales data:', salesError);
      } else {
        // Transform data to match frontend format
        const formattedSales = salesData.map(sale => ({
          id: sale.id,
          orderNumber: sale.order_number,
          bank: sale.bank,
          orderType: sale.order_type,
          assetType: sale.asset_type,
          fiatType: sale.fiat_type,
          totalPrice: sale.total_price,
          price: sale.price,
          quantity: sale.quantity,
          platform: sale.platform,
          name: sale.name,
          time: new Date(sale.created_at).toLocaleTimeString(),
          contactNo: sale.contact_no,
          createdAt: new Date(sale.created_at)
        } as SalesEntry));
        
        set(salesAtom, formattedSales);
      }
      
      // Load purchases data
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (purchasesError) {
        console.error('Error loading purchases data:', purchasesError);
      } else {
        // Transform data to match frontend format
        const formattedPurchases = purchasesData.map(purchase => ({
          id: purchase.id,
          orderNumber: purchase.order_number,
          bank: purchase.bank,
          orderType: purchase.order_type,
          assetType: purchase.asset_type,
          fiatType: purchase.fiat_type,
          totalPrice: purchase.total_price,
          price: purchase.price,
          quantity: purchase.quantity,
          platform: purchase.platform,
          name: purchase.name,
          time: new Date(purchase.created_at).toLocaleTimeString(),
          contactNo: purchase.contact_no,
          createdAt: new Date(purchase.created_at)
        } as PurchaseEntry));
        
        set(purchasesAtom, formattedPurchases);
      }
      
      // Load transfers data
      const { data: transfersData, error: transfersError } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (transfersError) {
        console.error('Error loading transfers data:', transfersError);
      } else {
        // Transform data to match frontend format
        const formattedTransfers = transfersData.map(transfer => ({
          id: transfer.id,
          from: transfer.from_platform,
          to: transfer.to_platform,
          quantity: transfer.quantity,
          createdAt: new Date(transfer.created_at)
        } as TransferEntry));
        
        set(transfersAtom, formattedTransfers);
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }
  }
);

// Clear all data (both local and Supabase)
export const clearDataAtom = atom(
  null,
  async (_, set) => {
    // Clear local storage
    set(salesAtom, []);
    set(purchasesAtom, []);
    set(transfersAtom, []);
    
    // Clear Supabase tables
    try {
      await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.error('Error clearing Supabase data:', error);
    }
  }
);