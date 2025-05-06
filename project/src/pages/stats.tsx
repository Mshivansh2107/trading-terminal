import React, { useEffect, useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { statsDataAtom, dashboardDataAtom, salesAtom, purchasesAtom } from '../store/data';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency, formatDate, calculateDailyProfitMargin, formatQuantity } from '../lib/utils';
import DateRangeFilter from '../components/date-range-filter';
import { dateRangeAtom, isSingleDaySelectionAtom, formatDateByRangeAtom } from '../store/filters';
import { CSVLink } from 'react-csv';
import TodayProfitWidget from '../components/today-profit-widget';
import { motion, AnimatePresence } from 'framer-motion';
import { dataVersionAtom } from '../store/data';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

const LiveNPMIndicator = () => {
  const [statsData] = useAtom(statsDataAtom);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [dataVersion] = useAtom(dataVersionAtom);
  const [isUpdated, setIsUpdated] = useState(false);
  const [prevNPM, setPrevNPM] = useState(0);
  
  // Calculate current NPM using the correct method
  const currentNPM = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    // Filter today's sales and purchases
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return isWithinInterval(saleDate, { start: todayStart, end: todayEnd });
    });
    
    const todayPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      return isWithinInterval(purchaseDate, { start: todayStart, end: todayEnd });
    });
    
    // Use the correct NPM calculation
    return calculateDailyProfitMargin(todaySales, todayPurchases);
  }, [sales, purchases, dataVersion]);
  
  // Effect to track changes
  useEffect(() => {
    if (currentNPM !== prevNPM) {
      setIsUpdated(true);
      setPrevNPM(currentNPM);
      
      // Reset the updated flag after 5 seconds
      const timer = setTimeout(() => {
        setIsUpdated(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentNPM, prevNPM, dataVersion]);
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <motion.span 
            className={`${isUpdated ? 'bg-green-500' : 'bg-blue-500'} w-3 h-3 rounded-full inline-block`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          Live NPM
          {isUpdated && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="text-xs font-normal text-green-500 ml-2"
            >
              Updated
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`npm-${currentNPM}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-4xl font-bold text-blue-600"
            >
              {formatCurrency(currentNPM)}
            </motion.div>
          </AnimatePresence>
          <div className="text-sm text-gray-500 mt-2">
            Today's Net Profit Margin
          </div>
          <div className="flex items-center mt-4">
            <div className={`w-3 h-3 rounded-full ${isUpdated ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
            <div className="text-xs text-gray-500">
              {isUpdated ? 'Live data - Updates automatically with new transactions' : 'Waiting for new data...'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Add new NPMTransactionChart component to show NPM changes with each transaction
const NPMTransactionChart = () => {
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [dataVersion] = useAtom(dataVersionAtom);
  const [npmMovementData, setNpmMovementData] = useState<{
    index: number;
    time: string;
    timestamp: number;
    type: string;
    amount: number;
    npm: number;
    npmChange: number;
    impact: string;
  }[]>([]);
  
  useEffect(() => {
    // Get today's transactions
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    // Filter today's transactions and sort by time
    const todayTransactions = [
      ...sales.map(s => ({ ...s, type: 'sale', timestamp: new Date(s.createdAt).getTime() })),
      ...purchases.map(p => ({ ...p, type: 'purchase', timestamp: new Date(p.createdAt).getTime() }))
    ].filter(t => new Date(t.createdAt) >= todayStart)
     .sort((a, b) => a.timestamp - b.timestamp);
    
    if (todayTransactions.length === 0) {
      setNpmMovementData([]);
      return;
    }
    
    // Process transactions chronologically to show NPM changes
    const movementData: {
      index: number;
      time: string;
      timestamp: number;
      type: string;
      amount: number;
      npm: number;
      npmChange: number;
      impact: string;
    }[] = [];
    let accumulatedSales: typeof sales = [];
    let accumulatedPurchases: typeof purchases = [];
    let previousNpm = 0;
    
    todayTransactions.forEach((transaction, index) => {
      // Add this transaction to the appropriate accumulated array
      if (transaction.type === 'sale') {
        accumulatedSales.push(transaction);
      } else {
        accumulatedPurchases.push(transaction);
      }
      
      // Get transaction amount
      const transactionAmount = transaction.totalPrice || 0;
      
      // Calculate NPM using the correct function from utils
      const currentNpm = calculateDailyProfitMargin(accumulatedSales, accumulatedPurchases);
      
      // Format time for display
      const transactionTime = new Date(transaction.createdAt);
      const timeString = transactionTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Determine if this transaction increased or decreased NPM
      const npmChange = currentNpm - previousNpm;
      previousNpm = currentNpm;
      
      movementData.push({
        index: index + 1,
        time: timeString,
        timestamp: transaction.timestamp,
        type: transaction.type,
        amount: transactionAmount,
        npm: currentNpm,
        npmChange,
        impact: npmChange > 0 ? 'positive' : npmChange < 0 ? 'negative' : 'neutral'
      });
    });
    
    setNpmMovementData(movementData);
  }, [sales, purchases, dataVersion]);
  
  // Custom tooltip for the npm movement chart
  const NpmMovementTooltip = ({ active, payload }: { active?: boolean, payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="text-sm font-semibold">{`Transaction #${data.index} (${data.time})`}</p>
          <p className="text-xs">{`Type: ${data.type === 'sale' ? 'Sale' : 'Purchase'}`}</p>
          <p className="text-xs">{`Amount: ${formatCurrency(data.amount)}`}</p>
          <p className="text-xs">{`NPM after transaction: ${formatCurrency(data.npm)}`}</p>
          <p className={`text-xs font-medium ${
            data.npmChange > 0 ? 'text-green-600' : 
            data.npmChange < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {`Impact: ${data.npmChange > 0 ? '↑' : data.npmChange < 0 ? '↓' : '='} ${formatCurrency(Math.abs(data.npmChange))}`}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  if (npmMovementData.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's NPM Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No transactions recorded today</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Today's NPM Movement</CardTitle>
        <div className="text-xs text-gray-500">
          Shows how each transaction affects the NPM throughout the day
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={npmMovementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                label={{ value: "Transaction Time", position: "insideBottomRight", offset: -5 }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<NpmMovementTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="npm" 
                name="NPM" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={6} 
                      fill={
                        payload.impact === 'positive' ? '#10B981' :
                        payload.impact === 'negative' ? '#EF4444' : 
                        '#6B7280'
                      }
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 8, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs">Improved NPM</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-xs">Reduced NPM</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span className="text-xs">No Change</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Add a custom component for the Daily NPM Chart with correct calculation
const DailyNPMChart = () => {
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [isSingleDay] = useAtom(isSingleDaySelectionAtom);
  const [dataVersion] = useAtom(dataVersionAtom);
  const [npmData, setNpmData] = useState<Array<{
    date: string;
    formattedDate: string;
    npm: number;
    salesQty: number;
    profit: number;
  }>>([]);
  
  // Get today's data in exactly the same way as Today's Profit Widget
  const todayData = useMemo(() => {
    // Use exactly the same date filtering as Today's Profit Widget
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    
    // Filter today's sales and purchases
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return isWithinInterval(saleDate, { start: todayStart, end: todayEnd });
    });
    
    const todayPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      return isWithinInterval(purchaseDate, { start: todayStart, end: todayEnd });
    });
    
    // Calculate sales quantity exactly as in Today's Profit Widget
    const todaySalesQty = todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    
    // Calculate NPM exactly as in Today's Profit Widget
    const todayNPM = calculateDailyProfitMargin(todaySales, todayPurchases);
    
    // Calculate profit exactly as in Today's Profit Widget
    const todayProfit = todaySalesQty * todayNPM;
    
    console.log('DailyNPMChart - TODAY DATA:', {
      salesCount: todaySales.length,
      purchasesCount: todayPurchases.length,
      salesQty: todaySalesQty,
      npm: todayNPM,
      profit: todayProfit,
      sampleTransactions: todaySales.slice(0, 3).map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        quantity: s.quantity
      }))
    });
    
    return {
      date: now.toISOString().split('T')[0],
      formattedDate: now.toLocaleDateString(),
      salesQty: todaySalesQty,
      npm: todayNPM,
      profit: todayProfit
    };
  }, [sales, purchases, dataVersion]);
  
  useEffect(() => {
    // Use the same date range handling as Today's Profit Widget would
    const shouldFilter = dateRange.isActive;
    const rangeStartDate = shouldFilter ? new Date(dateRange.startDate) : null;
    const rangeEndDate = shouldFilter ? new Date(dateRange.endDate) : null;
    
    // Check if date range includes today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    
    // Generate date map for past dates in range (excluding today which we handle separately)
    const dateMap = new Map<string, {
      date: string;
      formattedDate: string;
      npm: number;
      salesQty: number;
      profit: number;
    }>();
    
    // Process all transactions in date range except today
    // Group sales by date
    const salesByDate = new Map<string, typeof sales>();
    const purchasesByDate = new Map<string, typeof purchases>();
    
    // Process sales
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = saleDate.toISOString().split('T')[0];
      
      // Skip today's transactions - we handle that separately with exact Today's Profit Widget logic
      if (dateKey === today) {
        return;
      }
      
      // Skip if outside date range
      if (shouldFilter && 
          rangeStartDate && rangeEndDate && 
          (saleDate < rangeStartDate || saleDate > rangeEndDate)) {
        return;
      }
      
      if (!salesByDate.has(dateKey)) {
        salesByDate.set(dateKey, []);
      }
      salesByDate.get(dateKey)!.push(sale);
    });
    
    // Process purchases
    purchases.forEach(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      const dateKey = purchaseDate.toISOString().split('T')[0];
      
      // Skip today's transactions - we handle that separately with exact Today's Profit Widget logic
      if (dateKey === today) {
        return;
      }
      
      // Skip if outside date range
      if (shouldFilter && 
          rangeStartDate && rangeEndDate && 
          (purchaseDate < rangeStartDate || purchaseDate > rangeEndDate)) {
        return;
      }
      
      if (!purchasesByDate.has(dateKey)) {
        purchasesByDate.set(dateKey, []);
      }
      purchasesByDate.get(dateKey)!.push(purchase);
    });
    
    // Get all unique dates
    const allDates = new Set([...salesByDate.keys(), ...purchasesByDate.keys()]);
    
    // Calculate for each past date
    allDates.forEach(date => {
      const dailySales = salesByDate.get(date) || [];
      const dailyPurchases = purchasesByDate.get(date) || [];
      
      // Calculate sales quantity
      const dailySalesQty = dailySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
      
      // Calculate NPM
      const npmValue = calculateDailyProfitMargin(dailySales, dailyPurchases);
      
      // Calculate profit
      const dailyProfit = dailySalesQty * npmValue;
      
      // Format date for display
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString();
      
      // Add to date map
      dateMap.set(date, {
        date,
        formattedDate,
        npm: npmValue,
        salesQty: dailySalesQty,
        profit: dailyProfit
      });
    });
    
    // Convert map to array and add today's data
    const result = [...dateMap.values()];
    
    // Add today's data if in range or if not filtering
    const todayInRange = !shouldFilter || 
      (rangeStartDate && rangeEndDate && 
       todayStart >= rangeStartDate && todayEnd <= rangeEndDate);
       
    if (todayInRange) {
      // Add today's data using exact same calculation as Today's Profit Widget
      result.push(todayData);
    }
    
    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log('DailyNPMChart - Final results with exact today data:', {
      totalDays: result.length,
      hasToday: result.some(d => d.date === today),
      todayData: result.find(d => d.date === today)
    });
    
    setNpmData(result);
  }, [sales, purchases, dateRange, dataVersion, todayData]);
  
  if (npmData.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily NPM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">No NPM data available for the selected date range</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Daily NPM</CardTitle>
        <div className="text-xs text-gray-500">
          Uses exactly the same NPM calculation as Today's Profit Widget
        </div>
      </CardHeader>
      <CardContent>
        {/* Today's Data Highlight Box */}
        <div className="bg-blue-50 p-4 mb-4 rounded-md border border-blue-200">
          <h4 className="font-medium text-blue-700 mb-2">Today's Data (Using Exact Same Calculation as Today's Profit Widget)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Sales Qty</div>
              <div className="text-lg font-bold text-blue-600">
                {formatQuantity(todayData.salesQty)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">NPM</div>
              <div className="text-lg font-bold text-purple-600">
                {formatCurrency(todayData.npm)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Profit</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(todayData.profit)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={npmData}>
              <defs>
                <linearGradient id="colorNpm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                label={{ value: isSingleDay ? "Time" : "Date", position: "insideBottomRight", offset: -5 }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'npm') return formatCurrency(Number(value));
                  if (name === 'salesQty') return formatQuantity(Number(value));
                  if (name === 'profit') return formatCurrency(Number(value));
                  return value;
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="npm" 
                name="NPM" 
                stroke="#8884d8" 
                fillOpacity={1} 
                fill="url(#colorNpm)" 
                dot={{ stroke: '#8884d8', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2, fill: '#8884d8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Detailed data breakdown - exactly as in Today's Profit Widget */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Detailed Daily Data (Identical calculation to Today's Profit)</h3>
          <div className="bg-gray-50 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Qty</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NPM</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {npmData.map((day, index) => (
                    <tr key={day.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{day.formattedDate}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-blue-600">{formatQuantity(day.salesQty)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-purple-600">{formatCurrency(day.npm)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-green-600">{formatCurrency(day.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Profit = Sales Qty × NPM (identical to Today's Profit calculation)
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Calculation Method</div>
            <div className="text-sm font-medium">
              Same as Today's Profit Widget
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Daily Profit Formula</div>
            <div className="text-sm font-medium">
              Sales Qty × NPM
            </div>
          </div>
        </div>
        
        {/* Today's Raw Transactions (for debugging quantity issues) */}
        <div className="mt-6 border-t pt-4">
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1 rounded mb-2"
            onClick={() => {
              // Get today's date range
              const now = new Date();
              const todayStart = startOfDay(now);
              const todayEnd = endOfDay(now);
              
              // Filter today's transactions for debugging
              const todaySales = sales.filter(sale => {
                const saleDate = new Date(sale.createdAt);
                return isWithinInterval(saleDate, { start: todayStart, end: todayEnd });
              });
              
              console.log('Today\'s Raw Sales Transactions:', todaySales.map(s => ({
                id: s.id,
                createdAt: new Date(s.createdAt).toLocaleString(),
                quantity: s.quantity,
                totalPrice: s.totalPrice
              })));
              
              alert(`Detailed transaction data logged to console.\nTotal Sales Qty: ${todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0)}`);
            }}
          >
            Debug Today's Transactions
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

const Stats = () => {
  const [statsData] = useAtom(statsDataAtom);
  const [dashboardData] = useAtom(dashboardDataAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [isSingleDay] = useAtom(isSingleDaySelectionAtom);
  const [formatDateByRange] = useAtom(formatDateByRangeAtom);
  const [dataVersion] = useAtom(dataVersionAtom);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  
  // Ensure stats update when date range changes or data version changes
  useEffect(() => {
    // statsData and dashboardData are reactive and will recalculate
    // automatically when dateRange or dataVersion changes
    console.log("Stats data will refresh due to date range or data change");
  }, [dateRange, dataVersion]);
  
  // Generate pie chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  
  // Use sales data from the stats atom
  const salesByDayData = statsData.salesByDay;
  
  // Use purchases data from the stats atom
  const purchasesByDayData = statsData.purchasesByDay;
  
  // Create a variable that determines if we should show hourly view
  // Only show hourly view when a single day is selected AND date filtering is active
  const shouldShowHourlyView = dateRange.isActive && isSingleDay;
  
  // Prepare data for margin over time chart
  const marginData = salesByDayData.map((item, index) => {
    const purchaseAmount = purchasesByDayData[index]?.amount || 0;
    const margin = purchaseAmount > 0 ? ((item.amount - purchaseAmount) / purchaseAmount) * 100 : 0;
    
    return {
      date: item.date,
      margin: parseFloat(margin.toFixed(2))
    };
  });
  
  // Prepare data for combined chart
  const combinedData = salesByDayData.map((item, index) => {
    return {
      date: item.date,
      sales: item.amount,
      purchases: purchasesByDayData[index]?.amount || 0,
      profit: item.amount - (purchasesByDayData[index]?.amount || 0)
    };
  });

  // Add ProfitMarginSection component
  const ProfitMarginSection = () => {
    const [sales] = useAtom(salesAtom);
    const [purchases] = useAtom(purchasesAtom);
    const [dateRange] = useAtom(dateRangeAtom);
    const [dataVersion] = useAtom(dataVersionAtom);
    const [recalculatedMarginData, setRecalculatedMarginData] = useState<Array<{
      date: string;
      margin: number;
    }>>([]);
    
    // Use the correct NPM calculation method
    useEffect(() => {
      // Group transactions by date
      const salesByDate = new Map<string, typeof sales>();
      const purchasesByDate = new Map<string, typeof purchases>();
      
      // Filter by date range if active
      const shouldFilter = dateRange.isActive;
      const rangeStartDate = shouldFilter ? new Date(dateRange.startDate) : null;
      const rangeEndDate = shouldFilter ? new Date(dateRange.endDate) : null;
      
      // Categorize sales by date
      sales.forEach(sale => {
        const saleDate = new Date(sale.createdAt);
        // Skip if outside date range
        if (shouldFilter && 
            rangeStartDate && rangeEndDate && 
            (saleDate < rangeStartDate || saleDate > rangeEndDate)) {
          return;
        }
        
        const dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!salesByDate.has(dateKey)) {
          salesByDate.set(dateKey, []);
        }
        salesByDate.get(dateKey)!.push(sale);
      });
      
      // Categorize purchases by date
      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.createdAt);
        // Skip if outside date range
        if (shouldFilter && 
            rangeStartDate && rangeEndDate && 
            (purchaseDate < rangeStartDate || purchaseDate > rangeEndDate)) {
          return;
        }
        
        const dateKey = purchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!purchasesByDate.has(dateKey)) {
          purchasesByDate.set(dateKey, []);
        }
        purchasesByDate.get(dateKey)!.push(purchase);
      });
      
      // Get all unique dates
      const allDates = new Set([...salesByDate.keys(), ...purchasesByDate.keys()]);
      
      // Calculate NPM for each date using the correct function
      const marginData = Array.from(allDates).map(date => {
        const dailySales = salesByDate.get(date) || [];
        const dailyPurchases = purchasesByDate.get(date) || [];
        
        // Use the same calculation as in TodayProfitWidget
        const margin = calculateDailyProfitMargin(dailySales, dailyPurchases);
        
        return {
          date,
          margin
        };
      }).sort((a, b) => a.date.localeCompare(b.date)); // Sort by date
      
      setRecalculatedMarginData(marginData);
    }, [sales, purchases, dateRange, dataVersion]);
    
    // Skip render if no data
    if (recalculatedMarginData.length === 0) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>NPM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No NPM available.</p>
          </CardContent>
        </Card>
      );
    }

    // Format dates for display
    const formattedData = recalculatedMarginData.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString(),
      // Format margin for display
      margin: item.margin
    }));

    
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Statistics Dashboard</h1>
        <DateRangeFilter />
      </div>
      
      {/* Today's Profit Widget */}
      <div className="mb-6">
        <TodayProfitWidget />
      </div>
      
      {/* Add the NPM Transaction Chart here */}
      <NPMTransactionChart />
      
      {/* Sales & Purchases Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.salesByDay}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    label={{ value: shouldShowHourlyView ? "Time" : "Date", position: "insideBottomRight", offset: -5 }}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    name="Sales" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Total Sales</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(dashboardData.netSales)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Average Daily</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(salesByDayData.reduce((sum, item) => sum + item.amount, 0) / salesByDayData.length)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        
      </div>
      
      {/* Net Profit Margin (NPM) Chart */}
      <ProfitMarginSection />
      
      {/* Daily NPM Chart - using correct calculation */}
      <DailyNPMChart />
      
      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.cashList.filter(item => item.amount > 0)}
                    dataKey="amount"
                    nameKey="bank"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.cashList.filter(item => item.amount > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cash Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.cashList.filter(item => item.amount > 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bank" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sales vs Purchases */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sales vs Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  label={{ value: shouldShowHourlyView ? "Time" : "Date", position: "insideBottomRight", offset: -5 }}
                />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#10B981" />
                <Bar dataKey="purchases" name="Purchases" fill="#3B82F6" />
            
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* New Area Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Stand versus Time Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Stand versus Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.salesByDay}>
                  <defs>
                    <linearGradient id="colorSalesStand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    label={{ 
                      value: shouldShowHourlyView ? "Time of Day" : "Date", 
                      position: "insideBottomRight", 
                      offset: -5 
                    }}
                  />
                  <YAxis 
                    label={{ 
                      value: "Amount", 
                      angle: -90, 
                      position: "insideLeft"
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label) => shouldShowHourlyView ? `Time: ${label}` : `Date: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    name="Sales" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#colorSalesStand)" 
                    dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: 'white' }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-500 text-center">
              {shouldShowHourlyView ? 
                "Hourly sales distribution for the selected day" : 
                "Daily sales distribution for the selected date range"}
            </div>
          </CardContent>
        </Card>
        
        {/* Purchase Stand versus Time Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Stand versus Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.purchasesByDay}>
                  <defs>
                    <linearGradient id="colorPurchasesStand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    label={{ 
                      value: shouldShowHourlyView ? "Time of Day" : "Date", 
                      position: "insideBottomRight", 
                      offset: -5 
                    }}
                  />
                  <YAxis 
                    label={{ 
                      value: "Amount", 
                      angle: -90, 
                      position: "insideLeft"
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label) => shouldShowHourlyView ? `Time: ${label}` : `Date: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    name="Purchases" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorPurchasesStand)" 
                    dot={{ stroke: '#3B82F6', strokeWidth: 2, r: 4, fill: 'white' }}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#3B82F6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-500 text-center">
              {shouldShowHourlyView ? 
                "Hourly purchase distribution for the selected day" : 
                "Daily purchase distribution for the selected date range"}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(dashboardData.netSales)}
            </div>
            <p className="text-sm text-gray-600">Total sales across all platforms and banks</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle>Purchase Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(dashboardData.netPurchases)}
            </div>
            <p className="text-sm text-gray-600">Total purchases across all platforms and banks</p>
          </CardContent>
        </Card>
        
      
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader>
            <CardTitle>NPM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {formatCurrency(calculateDailyProfitMargin(
                sales.filter(sale => {
                  const today = new Date();
                  const todayStart = startOfDay(today);
                  const todayEnd = endOfDay(today);
                  const saleDate = new Date(sale.createdAt);
                  return isWithinInterval(saleDate, { start: todayStart, end: todayEnd });
                }), 
                purchases.filter(purchase => {
                  const today = new Date();
                  const todayStart = startOfDay(today);
                  const todayEnd = endOfDay(today);
                  const purchaseDate = new Date(purchase.createdAt);
                  return isWithinInterval(purchaseDate, { start: todayStart, end: todayEnd });
                })
              ))}
            </div>
            <p className="text-sm text-gray-600">Today's Net Profit Margin</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Live NPM Indicator */}
      <LiveNPMIndicator />
    </div>
  );
};

export default Stats;