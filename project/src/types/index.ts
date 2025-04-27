export type User = {
  id: string;
  username: string;
  pin: string;
}

export type Platform = 'BINANCE SS' | 'BINANCE AS' | 'BYBIT SS' | 'BYBIT AS' | 'BITGET SS' | 'BITGET AS' | 'KUCOIN SS' | 'KUCOIN AS';

export type Bank = 'IDBI' | 'INDUSIND SS' | 'HDFC CAA SS' | 'BOB SS' | 'CANARA SS' | 'HDFC SS' | 'INDUSIND BLYNK' | 'PNB';

export type Currency = 'INR' | 'USDT';

export type SalesEntry = {
  id: string;
  orderNumber: string;
  bank: Bank;
  orderType: 'Sell';
  assetType: string; 
  fiatType: Currency;
  totalPrice: number;
  price: number;
  quantity: number;
  platform: Platform;
  name: string;
  time: string;
  contactNo?: string;
  createdAt: Date;
}

export type PurchaseEntry = {
  id: string;
  orderNumber: string;
  bank: Bank;
  orderType: 'Buy';
  assetType: string;
  fiatType: Currency;
  totalPrice: number;
  price: number;
  quantity: number;
  platform: Platform;
  name: string;
  time: string;
  contactNo?: string;
  createdAt: Date;
}

export type TransferEntry = {
  id: string;
  from: Platform;
  to: Platform;
  quantity: number;
  createdAt: Date;
}

export type BankTransferEntry = {
  id: string;
  fromBank: string;
  fromAccount: string;
  toBank: string;
  toAccount: string;
  amount: number;
  reference?: string;
  createdAt: Date;
};

export type StockData = {
  platform: Platform;
  quantity: number;
}

export type CashData = {
  bank: Bank;
  amount: number;
}

export type ExpenseEntry = {
  id: string;
  bank: Bank;
  amount: number;
  type: 'expense' | 'income';
  category?: string;
  description?: string;
  createdAt: Date;
}

export type DashboardData = {
  salesPriceRange: number;
  totalCash: number;
  totalCashAlt: number;
  buyPriceRange: number;
  buyPriceRangeAlt: number;
  stockList: StockData[];
  cashList: CashData[];
  netSales: number;
  netPurchases: number;
  netExpenses: number;
  netIncomes: number;
  currentMargin: number;
  requiredMargin: number;
  netCash: number;
  netCashAfterSales: number;
}

export type StatsData = {
  salesByDay: {
    date: string;
    isoDate: string;
    amount: number;
  }[];
  purchasesByDay: {
    date: string;
    isoDate: string;
    amount: number;
  }[];
  expensesByDay: {
    date: string;
    isoDate: string;
    amount: number;
  }[];
  incomesByDay: {
    date: string;
    isoDate: string;
    amount: number;
  }[];
  salesByBank: {
    bank: Bank;
    amount: number;
  }[];
  salesByPlatform: {
    platform: Platform;
    amount: number;
  }[];
  purchasesByBank: {
    bank: Bank;
    amount: number;
  }[];
  purchasesByPlatform: {
    platform: Platform;
    amount: number;
  }[];
  expensesByBank: {
    bank: Bank;
    amount: number;
  }[];
  incomesByBank: {
    bank: Bank;
    amount: number;
  }[];
  cashDistribution: {
    bank: Bank;
    amount: number;
  }[];
}