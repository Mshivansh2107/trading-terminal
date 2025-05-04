import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { 
  SalesEntry, 
  PurchaseEntry, 
  TransferEntry,
  BankTransferEntry,
  ExpenseEntry,
  DashboardData,
  StatsData,
  Platform,
  Bank,
  BankEntity,
  PlatformEntity
} from '../types';
import { 
  calculateNetSales, 
  calculateNetPurchases, 
  calculateMargin,
  calculateStockBalance,
  calculateBankTotal,
  calculateDailyProfitMargin
} from '../lib/utils';
import { supabase } from '../lib/supabase';
import { authStateAtom } from './supabaseAuth';
import { getUsdtPrice } from '../lib/usdtPrice';
import { 
  filterByDateAtom, 
  isDateInRangeAtom, 
  dateRangeAtom, 
  isSingleDaySelectionAtom,
  formatDateByRangeAtom
} from './filters';
import { formatDate } from '../lib/utils';

// Initial data store
export const salesAtom = atomWithStorage<SalesEntry[]>('salesData', []);
export const purchasesAtom = atomWithStorage<PurchaseEntry[]>('purchasesData', []);
export const transfersAtom = atomWithStorage<TransferEntry[]>('transfersData', []);
export const bankTransfersAtom = atomWithStorage<BankTransferEntry[]>('bankTransfersData', []);
export const expensesAtom = atomWithStorage<ExpenseEntry[]>('expensesData', []);

// Settings
export const settingsAtom = atomWithStorage('appSettings', {
  requiredMargin: 3,
  currentUsdPrice: 0,
  salesPriceRange: 0,
  buyPriceUsdt: 0,
  lastUsdtPriceUpdate: null as number | null
});

// Add a new atom for syncing settings with backend
export const syncSettingsAtom = atom(
  null,
  async (get, set) => {
    try {
      // Get settings from backend
      const { data: settings, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'trading_settings')
        .single();

      if (error) throw error;

      if (settings?.value) {
        // Update local settings
        set(settingsAtom, {
          ...settings.value,
          lastUsdtPriceUpdate: Date.now()
        });
      }
    } catch (error) {
      console.error('Error syncing settings:', error);
    }
  }
);

// Add a new atom for updating settings in backend
export const updateSettingsAtom = atom(
  null,
  async (get, set, newSettings: Partial<{
    requiredMargin: number;
    currentUsdPrice: number;
    salesPriceRange: number;
    buyPriceUsdt: number;
    lastUsdtPriceUpdate: number | null;
  }>) => {
    try {
      const currentSettings = get(settingsAtom);
      const updatedSettings = {
        ...currentSettings,
        ...newSettings
      };

      // Update local state
      set(settingsAtom, updatedSettings);

      // Update backend
      const { error } = await supabase
        .from('settings')
        .update({
          value: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'trading_settings');

      if (error) throw error;
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }
);

// Add auto-fetch for USD price
export const autoFetchUsdPriceAtom = atom(
  null,
  async (get, set) => {
    try {
      const price = await getUsdtPrice();
      if (price > 0) {
        // Update both local and backend
        set(updateSettingsAtom, {
          currentUsdPrice: price,
          lastUsdtPriceUpdate: Date.now()
        });
      }
    } catch (error) {
      console.error('Error auto-fetching USD price:', error);
    }
  }
);

// Add a new atom for live USDT price updates
export const liveUsdtPriceAtom = atom(
  async (get) => {
    const settings = get(settingsAtom);
    const now = Date.now();
    
    // Only fetch new price if we haven't updated in the last ~65.5 minutes (3930000 ms)
    if (!settings.lastUsdtPriceUpdate || now - settings.lastUsdtPriceUpdate > 3930000) {
      const price = await getUsdtPrice();
      if (price > 0) {
        return price;
      }
    }
    return settings.currentUsdPrice;
  },
  (_get, set) => {
    const now = Date.now();
    getUsdtPrice().then(price => {
      if (price > 0) {
        set(settingsAtom, prev => ({
          ...prev,
          currentUsdPrice: price,
          lastUsdtPriceUpdate: now
        }));
      }
    });
  }
);

// Computed data for dashboard
export const dashboardDataAtom = atom<DashboardData>((get) => {
  // Get all data
  const sales = get(salesAtom);
  const purchases = get(purchasesAtom);
  const transfers = get(transfersAtom);
  const expenses = get(expensesAtom);
  const settings = get(settingsAtom);
  const availablePlatforms = get(platformsAtom);
  
  // Get filter functions and date range
  const filterByDate = get(filterByDateAtom);
  const isDateInRange = get(isDateInRangeAtom);
  const { isActive: isFilterActive } = get(dateRangeAtom);
  
  // Apply date filtering if active
  const filteredSales = filterByDate(sales);
  const filteredPurchases = filterByDate(purchases);
  const filteredTransfers = filterByDate(transfers);
  const filteredExpenses = filterByDate(expenses);
  
  // Calculate metrics using filtered data
  const netSales = calculateNetSales(filteredSales);
  const netPurchases = calculateNetPurchases(filteredPurchases);
  const netExpenses = filteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((total, e) => total + e.amount, 0);
  const netIncomes = filteredExpenses
    .filter(e => e.type === 'income')
    .reduce((total, e) => total + e.amount, 0);
  
  // Calculate NPM instead of simple percentage margin
  const currentMargin = (() => {
    // Group sales by totalPrice and quantity
    const totalSalesPrice = filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalSalesQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    
    // Group purchases by totalPrice and quantity
    const totalPurchasePrice = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalPrice, 0);
    const totalPurchaseQuantity = filteredPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
    
    console.log('Current NPM calculation for dashboard:', {
      totalSalesPrice,
      totalSalesQuantity,
      totalPurchasePrice,
      totalPurchaseQuantity,
      hasSufficientData: (totalSalesQuantity > 0 && totalPurchaseQuantity > 0) ? 'Yes' : 'No'
    });
    
    // If we don't have sufficient data, return 0
    if (totalSalesQuantity <= 0 || totalPurchaseQuantity <= 0) {
      console.log('Insufficient data for NPM calculation, returning 0');
      return 0;
    }
    
    // Calculate the ratios
    const salesRatio = totalSalesPrice / totalSalesQuantity;
    const purchaseRatio = totalPurchasePrice / totalPurchaseQuantity;
    
    // Calculate NPM
    const npmValue = salesRatio - purchaseRatio;
    console.log('NPM calculation complete:', {
      salesRatio,
      purchaseRatio,
      npmValue: parseFloat(npmValue.toFixed(2))
    });
    
    return parseFloat(npmValue.toFixed(2));
  })();
  
  // For stock calculations, we need to handle differently, as stock is cumulative:
  // - If filtering is active, calculate stock at the end of the filter period 
  // - If no filtering, show current stock
  const calculateAdjustedStockBalance = (platform: Platform) => {
    if (!isFilterActive) {
      // No filtering, use standard calculation
      return calculateStockBalance(purchases, sales, transfers, platform);
    } else {
      // Filter is active, calculate stock at end of period by:
      // 1. Including all purchases/sales/transfers up to the end date
      // Consider all transactions up to the filter end date
      const { endDate } = get(dateRangeAtom);
      const endDateTime = new Date(endDate).setHours(23, 59, 59, 999);
      
      const relevantPurchases = purchases.filter(p => new Date(p.createdAt).getTime() <= endDateTime);
      const relevantSales = sales.filter(s => new Date(s.createdAt).getTime() <= endDateTime);
      const relevantTransfers = transfers.filter(t => new Date(t.createdAt).getTime() <= endDateTime);
      
      return calculateStockBalance(relevantPurchases, relevantSales, relevantTransfers, platform);
    }
  };
  
  // Calculate stock balances using the adjusted method
  // Get platforms from the platformsAtom if available
  const platformNames = availablePlatforms.length > 0
    ? availablePlatforms.filter(p => p.isActive).map(p => p.name as Platform)
    : []; // No default platforms - wait for backend data
  
  const stockList = platformNames.map(platform => ({
    platform,
    quantity: calculateAdjustedStockBalance(platform)
  }))
  // Only include platforms with non-zero quantities or if they're active in the platforms list
  .filter(stock => stock.quantity !== 0 || platformNames.includes(stock.platform));
  
  // Similarly calculate cash balances up to the filter end date
  const calculateAdjustedBankBalance = (bank: Bank) => {
    if (!isFilterActive) {
      return (
        sales.filter(s => s.bank === bank).reduce((sum, s) => sum + s.totalPrice, 0) -
        purchases.filter(p => p.bank === bank).reduce((sum, p) => sum + p.totalPrice, 0) +
        expenses.filter(e => e.bank === bank && e.type === 'income').reduce((sum, e) => sum + e.amount, 0) -
        expenses.filter(e => e.bank === bank && e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)
      );
    } else {
      const { endDate } = get(dateRangeAtom);
      const endDateTime = new Date(endDate).setHours(23, 59, 59, 999);
      
      // Include all transactions up to end date
      return (
        sales.filter(s => s.bank === bank && new Date(s.createdAt).getTime() <= endDateTime)
          .reduce((sum, s) => sum + s.totalPrice, 0) -
        purchases.filter(p => p.bank === bank && new Date(p.createdAt).getTime() <= endDateTime)
          .reduce((sum, p) => sum + p.totalPrice, 0) +
        expenses.filter(e => e.bank === bank && e.type === 'income' && new Date(e.createdAt).getTime() <= endDateTime)
          .reduce((sum, e) => sum + e.amount, 0) -
        expenses.filter(e => e.bank === bank && e.type === 'expense' && new Date(e.createdAt).getTime() <= endDateTime)
          .reduce((sum, e) => sum + e.amount, 0)
      );
    }
  };
  
  // Use dynamic banks from banksAtom to generate cash list
  const availableBanks = get(banksAtom);
  
  // Get bank names from database only
  const bankNames: Bank[] = availableBanks.length > 0 
    ? availableBanks.filter(bank => bank.isActive).map(bank => bank.name as Bank)
    : []; // No default banks - wait for backend data
  
  // Generate cash list for all banks
  const cashList = bankNames.map(bankName => {
    return { 
      bank: bankName, 
      amount: calculateAdjustedBankBalance(bankName) 
    };
  });
  
  // Get current USDT price for stock value calculation
  const currentUsdPrice = settings.currentUsdPrice || 0;
  
  // Calculate net cash (sum of bank balances)
  const bankBalanceTotal = cashList.reduce((total, cash) => total + cash.amount, 0);
  const netCash = netSales - netPurchases + netIncomes - netExpenses;
  
  // Calculate total value of stock in USDT
  const totalStockValue = stockList.reduce((total, stock) => total + (stock.quantity * currentUsdPrice), 0);
  
  // Total cash is sum of bank balances plus stock value converted to INR
  const totalCash = bankBalanceTotal + totalStockValue;
  
  // Calculate average prices from filtered transactions
  const salesTransactions = filteredSales.length > 0 ? filteredSales : [];
  const purchaseTransactions = filteredPurchases.length > 0 ? filteredPurchases : [];
  
  // Calculate average sales price
  const totalSalesQuantity = salesTransactions.reduce((sum, s) => sum + s.quantity, 0);
  const totalSalesValue = salesTransactions.reduce((sum, s) => sum + s.totalPrice, 0);
  const calculatedSalesPrice = totalSalesQuantity > 0 
    ? parseFloat((totalSalesValue / totalSalesQuantity).toFixed(2)) 
    : 0;
  
  // Use manually set sales price range if available, otherwise use calculated value
  const salesPriceRange = settings.salesPriceRange > 0 
    ? settings.salesPriceRange 
    : calculatedSalesPrice;
  
  // Calculate average purchase price
  const totalPurchaseQuantity = purchaseTransactions.reduce((sum, p) => sum + p.quantity, 0);
  const totalPurchaseValue = purchaseTransactions.reduce((sum, p) => sum + p.totalPrice, 0);
  const averagePurchasePrice = totalPurchaseQuantity > 0 
    ? parseFloat((totalPurchaseValue / totalPurchaseQuantity).toFixed(2)) 
    : 0;
  
  // Calculate buy price range according to formula: ((buy price of USD - current price of USD) / current price of USD) * 100
  const buyPriceUsdt = settings.buyPriceUsdt || 0;
  let buyPriceRange = 0;
  
  if (currentUsdPrice > 0 && buyPriceUsdt > 0) {
    buyPriceRange = parseFloat((((buyPriceUsdt - currentUsdPrice) / currentUsdPrice) * 100).toFixed(2));
  }
  
  // Calculate values for alternative coins
  const buyPriceRangeAlt = 0; // This would ideally come from a separate calculation
  const requiredMargin = settings.requiredMargin;
  
  // Calculate net cash after sales started in POS
  // Sum all bank balances, except those that can be manually edited
  // Banks that are used for manual adjustments should be excluded
  const manuallyEditableBanks: string[] = [
    'ADJUSTMENT', 
    // Add any other banks that should be excluded from the "net cash after sales" calculation
    // These are typically banks that might have been manually edited to adjust balances
  ];
  
  const netCashAfterSales = cashList
    .filter(cash => !manuallyEditableBanks.includes(cash.bank))
    .reduce((sum, cash) => sum + cash.amount, 0);
  
  return {
    salesPriceRange,
    totalCash,
    totalCashAlt: netCash * 0.07, // Example: 7% of net cash in alternative currency
    buyPriceRange,
    buyPriceRangeAlt,
    stockList,
    cashList,
    netSales,
    netPurchases,
    netExpenses,
    netIncomes,
    currentMargin,
    requiredMargin,
    netCash,
    netCashAfterSales,
    salesByBank: cashList.map(cash => ({
      bank: cash.bank,
      total: cash.amount
    })),
  };
});

// Computed data for stats
export const statsDataAtom = atom<StatsData>((get) => {
  const sales = get(salesAtom);
  const purchases = get(purchasesAtom);
  const expenses = get(expensesAtom);
  const availablePlatforms = get(platformsAtom);
  
  // Get filter functions
  const filterByDate = get(filterByDateAtom);
  const isSingleDay = get(isSingleDaySelectionAtom);
  const formatDateByRange = get(formatDateByRangeAtom);
  const dateRange = get(dateRangeAtom);
  
  // Only use hourly view when both conditions are met:
  // 1. It's a single day selection
  // 2. Date filtering is actually active
  const shouldUseHourlyView = isSingleDay && dateRange.isActive;
  
  // Apply date filtering
  const filteredSales = filterByDate(sales);
  const filteredPurchases = filterByDate(purchases);
  const filteredExpenses = filterByDate(expenses);
  
  // Group sales by day or hour depending on selection
  const salesByDayOrHour = filteredSales.reduce((acc: {date: string, isoDate: string, amount: number}[], sale) => {
    const date = new Date(sale.createdAt);
    
    // Format differently based on single day or date range
    let dateKey, isoDateKey;
    
    if (shouldUseHourlyView) {
      // For single day view, group by hour of day
      dateKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      isoDateKey = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:00:00Z`;
    } else {
      // For multi-day view, group by date
      dateKey = date.toLocaleDateString();
      isoDateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    const existingDate = acc.find(item => item.date === dateKey);
    
    if (existingDate) {
      existingDate.amount += sale.totalPrice;
    } else {
      acc.push({ date: dateKey, isoDate: isoDateKey, amount: sale.totalPrice });
    }
    
    return acc;
  }, []);
  
  // Group purchases by day or hour depending on selection
  const purchasesByDayOrHour = filteredPurchases.reduce((acc: {date: string, isoDate: string, amount: number}[], purchase) => {
    const date = new Date(purchase.createdAt);
    
    // Format differently based on single day or date range
    let dateKey, isoDateKey;
    
    if (shouldUseHourlyView) {
      // For single day view, group by hour of day
      dateKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      isoDateKey = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:00:00Z`;
    } else {
      // For multi-day view, group by date
      dateKey = date.toLocaleDateString();
      isoDateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    const existingDate = acc.find(item => item.date === dateKey);
    
    if (existingDate) {
      existingDate.amount += purchase.totalPrice;
    } else {
      acc.push({ date: dateKey, isoDate: isoDateKey, amount: purchase.totalPrice });
    }
    
    return acc;
  }, []);
  
  // Group expenses by day or hour depending on selection
  const expensesByDayOrHour = filteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((acc: {date: string, isoDate: string, amount: number}[], expense) => {
      const date = new Date(expense.createdAt);
      
      // Format differently based on single day or date range
      let dateKey, isoDateKey;
      
      if (shouldUseHourlyView) {
        // For single day view, group by hour of day
        dateKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        isoDateKey = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:00:00Z`;
      } else {
        // For multi-day view, group by date
        dateKey = date.toLocaleDateString();
        isoDateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      const existingDate = acc.find(item => item.date === dateKey);
      
      if (existingDate) {
        existingDate.amount += expense.amount;
      } else {
        acc.push({ date: dateKey, isoDate: isoDateKey, amount: expense.amount });
      }
      
      return acc;
    }, []);
  
  // Group incomes by day or hour depending on selection
  const incomesByDayOrHour = filteredExpenses
    .filter(e => e.type === 'income')
    .reduce((acc: {date: string, isoDate: string, amount: number}[], income) => {
      const date = new Date(income.createdAt);
      
      // Format differently based on single day or date range
      let dateKey, isoDateKey;
      
      if (shouldUseHourlyView) {
        // For single day view, group by hour of day
        dateKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        isoDateKey = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:00:00Z`;
      } else {
        // For multi-day view, group by date
        dateKey = date.toLocaleDateString();
        isoDateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      const existingDate = acc.find(item => item.date === dateKey);
      
      if (existingDate) {
        existingDate.amount += income.amount;
      } else {
        acc.push({ date: dateKey, isoDate: isoDateKey, amount: income.amount });
      }
      
      return acc;
    }, []);

  // Sort the arrays by date/time
  const sortByIsoDate = (a: {isoDate: string}, b: {isoDate: string}) => 
    new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime();
    
  salesByDayOrHour.sort(sortByIsoDate);
  purchasesByDayOrHour.sort(sortByIsoDate);
  expensesByDayOrHour.sort(sortByIsoDate);
  incomesByDayOrHour.sort(sortByIsoDate);
  
  // If single day and no hourly data points, create empty time slots for visualization
  if (shouldUseHourlyView) {
    // Get the selected date
    const selectedDate = new Date(get(dateRangeAtom).startDate).toISOString().split('T')[0];
    
    // Create 24 hourly slots (for a full day) if we're in single-day mode
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    hours.forEach(hour => {
      const hourStr = hour.toString().padStart(2, '0');
      const timeStr = `${hourStr}:00`;
      const formattedTime = new Date(`2000-01-01T${hourStr}:00:00`).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const isoDateStr = `${selectedDate}T${hourStr}:00:00Z`;
      
      // Add empty data points for each series if they don't exist
      if (!salesByDayOrHour.find(item => item.isoDate === isoDateStr)) {
        salesByDayOrHour.push({ date: formattedTime, isoDate: isoDateStr, amount: 0 });
      }
      
      if (!purchasesByDayOrHour.find(item => item.isoDate === isoDateStr)) {
        purchasesByDayOrHour.push({ date: formattedTime, isoDate: isoDateStr, amount: 0 });
      }
      
      if (!expensesByDayOrHour.find(item => item.isoDate === isoDateStr)) {
        expensesByDayOrHour.push({ date: formattedTime, isoDate: isoDateStr, amount: 0 });
      }
      
      if (!incomesByDayOrHour.find(item => item.isoDate === isoDateStr)) {
        incomesByDayOrHour.push({ date: formattedTime, isoDate: isoDateStr, amount: 0 });
      }
    });
    
    // Re-sort after adding empty slots
    salesByDayOrHour.sort(sortByIsoDate);
    purchasesByDayOrHour.sort(sortByIsoDate);
    expensesByDayOrHour.sort(sortByIsoDate);
    incomesByDayOrHour.sort(sortByIsoDate);
  }
  
  // Calculate sales by bank
  // Get available banks from banksAtom
  const availableBanks = get(banksAtom);
  
  // Create bank list using only backend data
  const banksList = availableBanks.length > 0
    ? availableBanks
        .filter(bank => bank.isActive)
        .map(bank => ({
          bank: bank.name as Bank,
          amount: calculateBankTotal(filteredSales, bank.name as Bank)
        }))
    : []; // Empty array if no banks are available from backend
  
  // Get platform names from platformsAtom
  const platformsList = availablePlatforms.length > 0
    ? availablePlatforms
        .filter(platform => platform.isActive)
        .map(platform => ({
          platform: platform.name as Platform,
          amount: calculatePlatformTotal(filteredSales, platform.name)
        }))
    : []; // Empty array if no platforms are available from backend

  // Generate platform purchase statistics
  const platformPurchasesList = availablePlatforms.length > 0
    ? availablePlatforms
        .filter(platform => platform.isActive)
        .map(platform => ({
          platform: platform.name as Platform,
          amount: calculatePlatformTotal(filteredPurchases, platform.name)
        }))
    : []; // Empty array if no platforms are available from backend
  
  // Calculate daily profit margins
  const dailyProfitMargins = (() => {
    console.log('Starting NPM calculations for stats view');
    
    // Group sales by date
    const salesByDate = new Map<string, Array<{totalPrice: number, price: number, quantity: number}>>();
    filteredSales.forEach(sale => {
      const dateKey = new Date(sale.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!salesByDate.has(dateKey)) {
        salesByDate.set(dateKey, []);
      }
      salesByDate.get(dateKey)!.push({ 
        totalPrice: sale.totalPrice,
        price: sale.price,
        quantity: sale.quantity
      });
    });
    
    // Group purchases by date
    const purchasesByDate = new Map<string, Array<{totalPrice: number, price: number, quantity: number}>>();
    filteredPurchases.forEach(purchase => {
      const dateKey = new Date(purchase.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!purchasesByDate.has(dateKey)) {
        purchasesByDate.set(dateKey, []);
      }
      purchasesByDate.get(dateKey)!.push({ 
        totalPrice: purchase.totalPrice,
        price: purchase.price,
        quantity: purchase.quantity
      });
    });
    
    console.log('NPM calculation - Grouped data:', {
      datesWithSales: Array.from(salesByDate.keys()),
      datesWithPurchases: Array.from(purchasesByDate.keys()),
      totalDates: new Set([...salesByDate.keys(), ...purchasesByDate.keys()]).size
    });
    
    // Calculate profit margin for each date
    const allDates = new Set([...salesByDate.keys(), ...purchasesByDate.keys()]);
    
    const results = Array.from(allDates).map(date => {
      const salesForDay = salesByDate.get(date) || [];
      const purchasesForDay = purchasesByDate.get(date) || [];
      
      console.log(`NPM calculation for date: ${date}`, {
        salesCount: salesForDay.length,
        purchasesCount: purchasesForDay.length
      });
      
      const margin = calculateDailyProfitMargin(salesForDay, purchasesForDay);
      
      return {
        date,
        isoDate: date, // Already in ISO format
        margin
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort desc by date
    
    console.log('NPM calculation - Final results:', {
      totalDaysCalculated: results.length,
      sampleResults: results.slice(0, 3) // Log first 3 days as sample
    });
    
    return results;
  })();
  
  return {
    salesByDay: salesByDayOrHour,
    purchasesByDay: purchasesByDayOrHour,
    expensesByDay: expensesByDayOrHour,
    incomesByDay: incomesByDayOrHour,
    salesByBank: banksList,
    salesByPlatform: platformsList,
    purchasesByBank: banksList.map(bankItem => ({
      bank: bankItem.bank,
      amount: calculateBankTotal(filteredPurchases, bankItem.bank)
    })),
    purchasesByPlatform: platformPurchasesList,
    expensesByBank: banksList.map(bankItem => ({
      bank: bankItem.bank,
      amount: filteredExpenses.filter(e => e.bank === bankItem.bank && e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)
    })),
    incomesByBank: banksList.map(bankItem => ({
      bank: bankItem.bank,
      amount: filteredExpenses.filter(e => e.bank === bankItem.bank && e.type === 'income').reduce((sum, e) => sum + e.amount, 0)
    })),
    cashDistribution: get(dashboardDataAtom).cashList,
    dailyProfitMargins,
    
    // Calculate day-on-day NPM values (total USDT sales × NPM for each day)
    dailyNpmValues: (() => {
      // Group sales by date to calculate daily USDT volume
      const usdtSalesByDate = new Map<string, number>();
      
      // Sum up USDT quantities for each day
      filteredSales.forEach(sale => {
        const dateKey = new Date(sale.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTotal = usdtSalesByDate.get(dateKey) || 0;
        usdtSalesByDate.set(dateKey, currentTotal + sale.quantity);
      });
      
      // Calculate NPM for each day by multiplying that day's USDT sales by its margin
      const npmByDay = dailyProfitMargins.map(dayMargin => {
        const dateKey = dayMargin.date;
        const usdtSales = usdtSalesByDate.get(dateKey) || 0;
        
        // If no sales or margin is 0, NPM is 0
        const npmValue = (usdtSales === 0 || dayMargin.margin === 0) ? 0 : usdtSales * dayMargin.margin;
        
        return {
          date: dayMargin.date,
          isoDate: dayMargin.isoDate,
          npmValue: parseFloat(npmValue.toFixed(2))
        };
      }).sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime()); // Sort by date ascending
      
      console.log('Daily NPM values calculation:', {
        daysWithData: npmByDay.length,
        daysWithZeroNpm: npmByDay.filter(day => day.npmValue === 0).length,
        sampleData: npmByDay.slice(0, 3)
      });
      
      return npmByDay;
    })(),
    
    // Calculate NPM (total sales in USDT × current margin of today only)
    dailyNpm: (() => {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Get total sales for today in USDT (using quantity instead of total price)
      const todaySalesInUsdt = filteredSales
        .filter(sale => new Date(sale.createdAt).toISOString().split('T')[0] === today)
        .reduce((sum, sale) => sum + sale.quantity, 0);
      
      // Get today's margin from dailyProfitMargins
      const todayMargin = dailyProfitMargins.find(d => d.date === today)?.margin || 0;
      
      // If no sales today or margin is 0, NPM is 0
      const npm = (todaySalesInUsdt === 0 || todayMargin === 0) ? 0 : todaySalesInUsdt * todayMargin;
      
      console.log('Daily NPM calculation:', {
        today,
        todaySalesInUsdt,
        todayMargin,
        npm,
        isZero: npm === 0 ? 'Yes - No data for today' : 'No - Has valid data'
      });
      
      return npm;
    })()
  };
});

// Helper function to calculate total by platform
function calculatePlatformTotal(items: Array<{platform: string, totalPrice: number}>, platform: string): number {
  return items.filter(item => item.platform === platform).reduce((sum, item) => sum + item.totalPrice, 0);
}

// Actions
export const addSaleAtom = atom(
  null,
  async (get, set, newSale: Omit<SalesEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    const sales = get(salesAtom);
    const authState = get(authStateAtom);
    
    const saleWithId = {
      ...newSale,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      createdBy: authState.user?.email || 'Unknown user',
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
          created_at: saleWithId.createdAt.toISOString(),
          created_by: saleWithId.createdBy,
          user_id: authState.user?.id || null,
          username: authState.user?.email || null
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
    const authState = get(authStateAtom);
    
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
          created_at: purchaseWithId.createdAt.toISOString(),
          user_id: authState.user?.id || null,
          username: authState.user?.email || null
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
    const authState = get(authStateAtom);
    
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
          created_at: transferWithId.createdAt.toISOString(),
          user_id: authState.user?.id || null,
          username: authState.user?.email || null
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

// Add bank transfer atom
export const addBankTransferAtom = atom(
  null,
  async (get, set, newTransfer: Omit<BankTransferEntry, 'id' | 'createdAt'>) => {
    const transfers = get(bankTransfersAtom);
    const authState = get(authStateAtom);
    
    const transferWithId = {
      ...newTransfer,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    // Save to local storage via jotai
    set(bankTransfersAtom, [...transfers, transferWithId as BankTransferEntry]);
    
    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from('bank_transfers')
        .insert({
          id: transferWithId.id,
          from_bank: transferWithId.fromBank,
          from_account: transferWithId.fromAccount,
          to_bank: transferWithId.toBank,
          to_account: transferWithId.toAccount,
          amount: transferWithId.amount,
          reference: transferWithId.reference,
          created_at: transferWithId.createdAt.toISOString(),
          user_id: authState.user?.id || null,
          username: authState.user?.email || null
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

// Add expense to the store
export const addExpenseAtom = atom(
  null,
  async (get, set, expenseData: Omit<ExpenseEntry, 'id' | 'createdAt'>) => {
    const expenses = get(expensesAtom);
    
    // Create a complete expense object with id and createdAt
    const newExpense: ExpenseEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...expenseData
    };
    
    // Add to local state
    set(expensesAtom, [...expenses, newExpense]);

    // Save to Supabase
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          id: newExpense.id,
          bank: newExpense.bank,
          amount: newExpense.amount,
          type: newExpense.type,
          category: newExpense.category,
          description: newExpense.description,
          created_at: newExpense.createdAt
        });

      if (error) {
        console.error('Error adding expense:', error);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }

    // Save to local storage
    localStorage.setItem('expenses', JSON.stringify(get(expensesAtom)));
  }
);

// Delete expense from the store
export const deleteExpenseAtom = atom(
  null,
  async (get, set, id: string) => {
    // Get current expenses
    const expenses = get(expensesAtom);
    
    // Remove from local state
    set(expensesAtom, expenses.filter(e => e.id !== id));

    // Delete from Supabase
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting expense:', error);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  }
);

// Delete sale from the store
export const deleteSaleAtom = atom(
  null,
  async (get, set, saleId: string) => {
    try {
      const sales = get(salesAtom);
      const filteredSales = sales.filter((sale) => sale.id !== saleId);
      set(salesAtom, filteredSales);

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) {
        console.error('Error deleting sale:', error);
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  }
);

// Delete purchase from the store
export const deletePurchaseAtom = atom(
  null,
  async (get, set, purchaseId: string) => {
    try {
      const purchases = get(purchasesAtom);
      const filteredPurchases = purchases.filter((purchase) => purchase.id !== purchaseId);
      set(purchasesAtom, filteredPurchases);

      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) {
        console.error('Error deleting purchase:', error);
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  }
);

// Delete transfer from the store
export const deleteTransferAtom = atom(
  null,
  async (get, set, transferId: string) => {
    try {
      const transfers = get(transfersAtom);
      const filteredTransfers = transfers.filter((transfer) => transfer.id !== transferId);
      set(transfersAtom, filteredTransfers);

      const { error } = await supabase
        .from('transfers')
        .delete()
        .eq('id', transferId);

      if (error) {
        console.error('Error deleting transfer:', error);
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
    }
  }
);

// Delete bank transfer from the store
export const deleteBankTransferAtom = atom(
  null,
  async (get, set, bankTransferId: string) => {
    try {
      const bankTransfers = get(bankTransfersAtom);
      const filteredBankTransfers = bankTransfers.filter((transfer) => transfer.id !== bankTransferId);
      set(bankTransfersAtom, filteredBankTransfers);

      const { error } = await supabase
        .from('bank_transfers')
        .delete()
        .eq('id', bankTransferId);

      if (error) {
        console.error('Error deleting bank transfer:', error);
      }
    } catch (error) {
      console.error('Error deleting bank transfer:', error);
    }
  }
);

// Function to fetch all data from Supabase
export const refreshDataAtom = atom(
  null,
  async (get, set) => {
    const authState = get(authStateAtom);
    
    // Only fetch if user is authenticated
    if (!authState.isAuthenticated) {
      return;
    }
    
    try {
      // Fetch banks and platforms
      set(fetchBanksAtom);
      set(fetchPlatformsAtom);
      
      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*, edited_by, updated_at')
        .order('created_at', { ascending: false });
      
      if (salesError) {
        console.error('Error fetching sales:', salesError);
      } else {
        // Transform to local format
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
          contactNo: sale.contact_no,
          createdAt: new Date(sale.created_at),
          updatedAt: sale.updated_at ? new Date(sale.updated_at) : undefined,
          editedBy: sale.edited_by || undefined,
          createdBy: sale.created_by || sale.username || 'Unknown user'
        }));
        
        set(salesAtom, formattedSales);
      }
      
      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*, edited_by, updated_at')
        .order('created_at', { ascending: false });
      
      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
      } else {
        // Transform to local format
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
          contactNo: purchase.contact_no,
          createdAt: new Date(purchase.created_at),
          updatedAt: purchase.updated_at ? new Date(purchase.updated_at) : undefined,
          editedBy: purchase.edited_by || undefined,
          createdBy: purchase.created_by || purchase.username || 'Unknown user'
        }));
        
        set(purchasesAtom, formattedPurchases);
      }
      
      // Fetch transfers
      const { data: transfersData, error: transfersError } = await supabase
        .from('transfers')
        .select('*, edited_by, updated_at')
        .order('created_at', { ascending: false });
      
      if (transfersError) {
        console.error('Error fetching transfers:', transfersError);
      } else {
        // Transform to local format
        const formattedTransfers = transfersData.map(transfer => ({
          id: transfer.id,
          from: transfer.from_platform,
          to: transfer.to_platform,
          quantity: transfer.quantity,
          createdAt: new Date(transfer.created_at),
          updatedAt: transfer.updated_at ? new Date(transfer.updated_at) : undefined,
          editedBy: transfer.edited_by || undefined,
          createdBy: transfer.created_by || transfer.username || 'Unknown user'
        }));
        
        set(transfersAtom, formattedTransfers);
      }

      // Fetch bank transfers
      const { data: bankTransfersData, error: bankTransfersError } = await supabase
        .from('bank_transfers')
        .select('*, edited_by, updated_at')
        .order('created_at', { ascending: false });
      
      if (bankTransfersError) {
        console.error('Error fetching bank transfers:', bankTransfersError);
      } else {
        // Transform to local format
        const formattedBankTransfers = bankTransfersData.map(transfer => ({
          id: transfer.id,
          fromBank: transfer.from_bank,
          fromAccount: transfer.from_account,
          toBank: transfer.to_bank,
          toAccount: transfer.to_account,
          amount: transfer.amount,
          reference: transfer.reference,
          createdAt: new Date(transfer.created_at),
          updatedAt: transfer.updated_at ? new Date(transfer.updated_at) : undefined,
          editedBy: transfer.edited_by || undefined
        }));
        
        set(bankTransfersAtom, formattedBankTransfers);
      }

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
      } else {
        // Transform to local format
        const formattedExpenses = expensesData.map(expense => ({
          id: expense.id,
          bank: expense.bank,
          amount: expense.amount,
          type: expense.type,
          category: expense.category,
          description: expense.description,
          createdAt: new Date(expense.created_at),
          createdBy: expense.created_by || expense.username || 'Unknown user'
        }));
        
        set(expensesAtom, formattedExpenses);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
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
    set(bankTransfersAtom, []);
    set(expensesAtom, []);
    
    // Clear Supabase tables
    try {
      await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bank_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.error('Error clearing Supabase data:', error);
    }
  }
);

// Actions for updating existing entries
export const updateSaleAtom = atom(
  null,
  async (get, set, updatedSale: SalesEntry) => {
    const sales = get(salesAtom);
    const authState = get(authStateAtom);
    
    // Update in local storage via jotai
    set(salesAtom, sales.map(sale => 
      sale.id === updatedSale.id ? updatedSale : sale
    ));
    
    // Update in Supabase
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({
          order_number: updatedSale.orderNumber,
          bank: updatedSale.bank,
          order_type: updatedSale.orderType,
          asset_type: updatedSale.assetType,
          fiat_type: updatedSale.fiatType,
          total_price: updatedSale.totalPrice,
          price: updatedSale.price,
          quantity: updatedSale.quantity,
          platform: updatedSale.platform,
          name: updatedSale.name,
          contact_no: updatedSale.contactNo,
          edited_by: authState.user?.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedSale.id);
      
      if (error) {
        console.error('Error updating in Supabase:', error);
      } else {
        console.log('Successfully updated in Supabase:', data);
      }
    } catch (error) {
      console.error('Error updating in Supabase:', error);
    }
  }
);

export const updatePurchaseAtom = atom(
  null,
  async (get, set, updatedPurchase: PurchaseEntry) => {
    const purchases = get(purchasesAtom);
    const authState = get(authStateAtom);
    
    // Update in local storage via jotai
    set(purchasesAtom, purchases.map(purchase => 
      purchase.id === updatedPurchase.id ? updatedPurchase : purchase
    ));
    
    // Update in Supabase
    try {
      const { data, error } = await supabase
        .from('purchases')
        .update({
          order_number: updatedPurchase.orderNumber,
          bank: updatedPurchase.bank,
          order_type: updatedPurchase.orderType,
          asset_type: updatedPurchase.assetType,
          fiat_type: updatedPurchase.fiatType,
          total_price: updatedPurchase.totalPrice,
          price: updatedPurchase.price,
          quantity: updatedPurchase.quantity,
          platform: updatedPurchase.platform,
          name: updatedPurchase.name,
          contact_no: updatedPurchase.contactNo,
          edited_by: authState.user?.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedPurchase.id);
      
      if (error) {
        console.error('Error updating in Supabase:', error);
      } else {
        console.log('Successfully updated in Supabase:', data);
      }
    } catch (error) {
      console.error('Error updating in Supabase:', error);
    }
  }
);

export const updateTransferAtom = atom(
  null,
  async (get, set, updatedTransfer: TransferEntry) => {
    const transfers = get(transfersAtom);
    const authState = get(authStateAtom);
    
    // Update in local storage via jotai
    set(transfersAtom, transfers.map(transfer => 
      transfer.id === updatedTransfer.id ? updatedTransfer : transfer
    ));
    
    // Update in Supabase
    try {
      const { data, error } = await supabase
        .from('transfers')
        .update({
          from_platform: updatedTransfer.from,
          to_platform: updatedTransfer.to,
          quantity: updatedTransfer.quantity,
          edited_by: authState.user?.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTransfer.id);
      
      if (error) {
        console.error('Error updating in Supabase:', error);
      } else {
        console.log('Successfully updated in Supabase:', data);
      }
    } catch (error) {
      console.error('Error updating in Supabase:', error);
    }
  }
);

export const updateBankTransferAtom = atom(
  null,
  async (get, set, updatedTransfer: BankTransferEntry) => {
    const transfers = get(bankTransfersAtom);
    const authState = get(authStateAtom);
    
    // Update in local storage via jotai
    set(bankTransfersAtom, transfers.map(transfer => 
      transfer.id === updatedTransfer.id ? updatedTransfer : transfer
    ));
    
    // Update in Supabase
    try {
      const { data, error } = await supabase
        .from('bank_transfers')
        .update({
          from_bank: updatedTransfer.fromBank,
          from_account: updatedTransfer.fromAccount,
          to_bank: updatedTransfer.toBank,
          to_account: updatedTransfer.toAccount,
          amount: updatedTransfer.amount,
          reference: updatedTransfer.reference,
          edited_by: authState.user?.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTransfer.id);
      
      if (error) {
        console.error('Error updating in Supabase:', error);
      } else {
        console.log('Successfully updated in Supabase:', data);
      }
    } catch (error) {
      console.error('Error updating in Supabase:', error);
    }
  }
);

export const updateExpenseAtom = atom(
  null,
  async (get, set, expense: ExpenseEntry) => {
    const expenses = get(expensesAtom);
    const updatedExpenses = expenses.map((e) => 
      e.id === expense.id ? expense : e
    );
    set(expensesAtom, updatedExpenses);
    
    try {
      // Update in Supabase
      const { data, error } = await supabase
        .from('expenses')
        .update({
          bank: expense.bank,
          amount: expense.amount,
          type: expense.type,
          category: expense.category,
          description: expense.description,
          created_at: expense.createdAt,
        })
        .eq('id', expense.id);

      if (error) {
        console.error('Error updating expense:', error);
      }
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  }
);

// Manual stock balance update atom - used for correcting stock quantities
export const updateStockBalanceAtom = atom(
  null,
  async (get, set, data: { platform: string; quantity: number }) => {
    const { platform, quantity } = data;
    const purchases = get(purchasesAtom);
    const sales = get(salesAtom);
    const transfers = get(transfersAtom);
    const authState = get(authStateAtom);
    
    try {
      console.log('Starting stock balance update for platform:', platform);
      
      // Calculate current stock
      const currentStock = calculateStockBalance(purchases, sales, transfers, platform);
      console.log('Current stock:', currentStock, 'Target quantity:', quantity);
      
      // Calculate the difference needed to reach the target quantity
      const difference = quantity - currentStock;
      console.log('Difference to adjust:', difference);
      
      if (difference === 0) {
        console.log('No adjustment needed, stocks already match');
        return; // No adjustment needed
      }
      
      // Create an adjustment transfer record
      // Use a special "ADJUSTMENT" platform that won't affect other real platforms
      let transferParams;
      if (difference > 0) {
        // We need to add stock, transfer from ADJUSTMENT to the target platform
        transferParams = {
          from: "ADJUSTMENT" as Platform, // Use type assertion to treat as a Platform
          to: platform as Platform,
          quantity: Math.abs(difference)
        };
        console.log(`Creating adjustment transfer TO ${platform} of ${Math.abs(difference)}`);
      } else {
        // We need to reduce stock, transfer from the platform to ADJUSTMENT
        transferParams = {
          from: platform as Platform,
          to: "ADJUSTMENT" as Platform, // Use type assertion to treat as a Platform
          quantity: Math.abs(difference)
        };
        console.log(`Creating adjustment transfer FROM ${platform} of ${Math.abs(difference)}`);
      }
      
      // Create a transfer with an ID and timestamp
      const transferWithId: TransferEntry = {
        ...transferParams,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: authState.user?.email || 'Unknown user'
      };
      
      console.log('Transfer record created:', transferWithId);
      
      // Update in local storage
      set(transfersAtom, [...transfers, transferWithId]);
      console.log('Local state updated with new transfer');
      
      // Save to Supabase with notes indicating this is a manual adjustment
      console.log('Saving to Supabase...');
      
      const supabaseTransferData = {
        id: transferWithId.id,
        from_platform: transferWithId.from,
        to_platform: transferWithId.to,
        quantity: transferWithId.quantity,
        created_at: transferWithId.createdAt.toISOString(),
        created_by: transferWithId.createdBy,
        user_id: authState.user?.id || null,
        username: authState.user?.email || null,
        notes: `Manual stock adjustment to set ${platform} balance to ${quantity}`
      };
      
      console.log('Transfer data to save:', supabaseTransferData);
      
      const { error } = await supabase
        .from('transfers')
        .insert(supabaseTransferData);
      
      if (error) {
        console.error('Error saving stock adjustment to Supabase:', error);
        throw error;
      }
      
      console.log('Stock adjustment successfully saved to Supabase');
      
      // Verify the transfer was saved by fetching the record
      const { data: verificationData, error: verificationError } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', transferWithId.id)
        .single();
        
      if (verificationError) {
        console.error('Verification failed, transfer may not be saved:', verificationError);
      } else {
        console.log('Verified transfer was saved:', verificationData);
      }
      
      return transferWithId;
    } catch (error) {
      console.error('Error adjusting stock balance:', error);
      throw error;
    }
  }
);

// Manual cash balance update atom - used for correcting bank balances
export const updateCashBalanceAtom = atom(
  null,
  async (get, set, data: { bank: string; amount: number }) => {
    const { bank, amount } = data;
    const sales = get(salesAtom);
    const purchases = get(purchasesAtom);
    const expenses = get(expensesAtom);
    const authState = get(authStateAtom);
    
    try {
      console.log('Starting cash balance update for bank:', bank);
      
      // Calculate current bank balance
      const currentAmount = 
        sales.filter(s => s.bank === bank).reduce((sum, s) => sum + s.totalPrice, 0) -
        purchases.filter(p => p.bank === bank).reduce((sum, p) => sum + p.totalPrice, 0) +
        expenses.filter(e => e.bank === bank && e.type === 'income').reduce((sum, e) => sum + e.amount, 0) -
        expenses.filter(e => e.bank === bank && e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
      
      console.log('Current bank amount:', currentAmount, 'Target amount:', amount);
      
      // Calculate the difference needed to reach the target amount
      const difference = amount - currentAmount;
      console.log('Difference to adjust:', difference);
      
      if (difference === 0) {
        console.log('No adjustment needed, amounts already match');
        return; // No adjustment needed
      }
      
      // Use type assertion to treat the bank string as a valid Bank type
      // Assuming the bank parameter is one of the valid Bank types
      const validBank = bank as Bank;
      
      // Create an expense/income entry based on the difference
      const expenseWithId: ExpenseEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        bank: validBank,
        amount: Math.abs(difference),
        type: difference > 0 ? 'income' : 'expense',
        category: 'Manual Adjustment',
        description: `Manual adjustment to set ${bank} balance to ${amount}`,
        createdBy: authState.user?.email || 'Unknown user'
      };
      
      console.log('Expense/income record created:', expenseWithId);
      
      // Update in local storage
      set(expensesAtom, [...expenses, expenseWithId]);
      console.log('Local state updated with new expense/income');
      
      // Save to Supabase
      console.log('Saving to Supabase...');
      
      const supabaseExpenseData = {
        id: expenseWithId.id,
        bank: expenseWithId.bank,
        amount: expenseWithId.amount,
        type: expenseWithId.type,
        category: expenseWithId.category,
        description: expenseWithId.description,
        created_at: expenseWithId.createdAt.toISOString(),
        user_id: authState.user?.id || null,
        username: authState.user?.email || null
      };
      
      console.log('Expense data to save:', supabaseExpenseData);
      
      const { error } = await supabase
        .from('expenses')
        .insert(supabaseExpenseData);
      
      if (error) {
        console.error('Error saving cash adjustment to Supabase:', error);
        throw error;
      }
      
      console.log('Cash adjustment successfully saved to Supabase');
      
      // Verify the expense was saved by fetching the record
      const { data: verificationData, error: verificationError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseWithId.id)
        .single();
        
      if (verificationError) {
        console.error('Verification failed, expense may not be saved:', verificationError);
      } else {
        console.log('Verified expense was saved:', verificationData);
      }
      
      return expenseWithId;
    } catch (error) {
      console.error('Error adjusting cash balance:', error);
      throw error;
    }
  }
);

// Banks atom to store bank data globally
export const banksAtom = atom<BankEntity[]>([]);

// Function to fetch banks from database
export const fetchBanksAtom = atom(
  null,
  async (get, set) => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Map database results to BankEntity
        const formattedBanks: BankEntity[] = data.map(bank => ({
          id: bank.id,
          name: bank.name,
          description: bank.description,
          isActive: bank.is_active,
          createdAt: new Date(bank.created_at),
          updatedAt: new Date(bank.updated_at || bank.created_at)
        }));
        set(banksAtom, formattedBanks);
      } else {
        // No banks in database
        console.log('No banks found in database');
        set(banksAtom, []);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      // Do not set fallback banks on error
      set(banksAtom, []);
    }
  }
);

// Add bank function
export const addBankAtom = atom(
  null,
  async (get, set, bank: Omit<BankEntity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const banks = get(banksAtom);
    const authState = get(authStateAtom);
    
    try {
      const { data, error } = await supabase
        .from('banks')
        .insert({
          name: bank.name,
          description: bank.description,
          is_active: bank.isActive
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding bank:', error);
        throw error;
      }
      
      const newBank: BankEntity = {
        id: data.id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
      
      set(banksAtom, [...banks, newBank]);
      return newBank;
    } catch (error) {
      console.error('Error adding bank:', error);
      throw error;
    }
  }
);

// Update bank function
export const updateBankAtom = atom(
  null,
  async (get, set, bank: BankEntity) => {
    const banks = get(banksAtom);
    
    try {
      const { error } = await supabase
        .from('banks')
        .update({
          name: bank.name,
          description: bank.description,
          is_active: bank.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', bank.id);
      
      if (error) {
        console.error('Error updating bank:', error);
        throw error;
      }
      
      set(banksAtom, banks.map(b => b.id === bank.id ? { ...bank, updatedAt: new Date() } : b));
      return bank;
    } catch (error) {
      console.error('Error updating bank:', error);
      throw error;
    }
  }
);

// Delete bank function
export const deleteBankAtom = atom(
  null,
  async (get, set, bankId: string) => {
    const banks = get(banksAtom);
    
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', bankId);
      
      if (error) {
        console.error('Error deleting bank:', error);
        throw error;
      }
      
      set(banksAtom, banks.filter(b => b.id !== bankId));
    } catch (error) {
      console.error('Error deleting bank:', error);
      throw error;
    }
  }
);

// Add platformsAtom after banksAtom
export const platformsAtom = atom<PlatformEntity[]>([]);

// Function to fetch platforms from database
export const fetchPlatformsAtom = atom(
  null,
  async (get, set) => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Map database results to PlatformEntity
        const formattedPlatforms: PlatformEntity[] = data.map(platform => ({
          id: platform.id,
          name: platform.name,
          description: platform.description,
          isActive: platform.is_active,
          createdAt: new Date(platform.created_at),
          updatedAt: new Date(platform.updated_at || platform.created_at)
        }));
        set(platformsAtom, formattedPlatforms);
      } else {
        // No platforms in database
        console.log('No platforms found in database');
        set(platformsAtom, []);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
      // Do not set fallback platforms on error
      set(platformsAtom, []);
    }
  }
);

// Add platform function
export const addPlatformAtom = atom(
  null,
  async (get, set, platform: Omit<PlatformEntity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const platforms = get(platformsAtom);
    
    try {
      const { data, error } = await supabase
        .from('platforms')
        .insert({
          name: platform.name,
          description: platform.description,
          is_active: platform.isActive
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding platform:', error);
        throw error;
      }
      
      const newPlatform: PlatformEntity = {
        id: data.id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
      
      set(platformsAtom, [...platforms, newPlatform]);
      return newPlatform;
    } catch (error) {
      console.error('Error adding platform:', error);
      throw error;
    }
  }
);

// Update platform function
export const updatePlatformAtom = atom(
  null,
  async (get, set, platform: PlatformEntity) => {
    const platforms = get(platformsAtom);
    
    try {
      const { error } = await supabase
        .from('platforms')
        .update({
          name: platform.name,
          description: platform.description,
          is_active: platform.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', platform.id);
      
      if (error) {
        console.error('Error updating platform:', error);
        throw error;
      }
      
      set(platformsAtom, platforms.map(p => p.id === platform.id ? { ...platform, updatedAt: new Date() } : p));
      return platform;
    } catch (error) {
      console.error('Error updating platform:', error);
      throw error;
    }
  }
);

// Delete platform function
export const deletePlatformAtom = atom(
  null,
  async (get, set, platformId: string) => {
    const platforms = get(platformsAtom);
    
    try {
      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', platformId);
      
      if (error) {
        console.error('Error deleting platform:', error);
        throw error;
      }
      
      set(platformsAtom, platforms.filter(p => p.id !== platformId));
    } catch (error) {
      console.error('Error deleting platform:', error);
      throw error;
    }
  }
);