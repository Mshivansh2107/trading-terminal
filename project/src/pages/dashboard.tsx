import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';
import { dashboardDataAtom, refreshDataAtom, statsDataAtom, settingsAtom, salesAtom, purchasesAtom, transfersAtom, updateStockBalanceAtom, updateCashBalanceAtom } from '../store/data';
import DashboardCard from '../components/layout/dashboard-card';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency, formatQuantity, prepareExportData } from '../lib/utils';
import { 
  ArrowDownUp, 
  RefreshCw, 
  DollarSign,
  BarChart2,
  Settings,
  DatabaseIcon,
  Download,
  Edit,
  Plus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { authStateAtom } from '../store/supabaseAuth';
import SettingsModal from '../components/settings-modal';
import ErrorBoundary from '../components/error-boundary';
import { CSVLink } from "react-csv";
import { Transaction } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DateRangeFilter from '../components/date-range-filter';
import { dateRangeAtom } from '../store/filters';

const Dashboard = () => {
  const [dashboardData] = useAtom(dashboardDataAtom);
  const [statsData] = useAtom(statsDataAtom);
  const [authState] = useAtom(authStateAtom);
  const [settings] = useAtom(settingsAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'cash'>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [transfers] = useAtom(transfersAtom);
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();

  // Refs for chart containers
  const salesChartRef = useRef<HTMLDivElement>(null);
  const stockChartRef = useRef<HTMLDivElement>(null);
  const cashChartRef = useRef<HTMLDivElement>(null);
  
  // Generate colors for charts
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#F97316'];
  
  // Calculate margin status
  const marginStatus = dashboardData.currentMargin >= dashboardData.requiredMargin ? 'up' : 'down';

  // Handle data refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  // Function to capture chart as image
  const captureChart = async (ref: React.RefObject<HTMLDivElement>, chartName: string): Promise<Blob | null> => {
    if (!ref.current) return null;
    
    try {
      // Store original styles
      const originalWidth = ref.current.style.width;
      const originalHeight = ref.current.style.height;
      
      // Set capturing state
      setIsCapturing(true);
      
      // Temporarily increase size for higher resolution
      ref.current.style.width = '1920px';
      ref.current.style.height = '1080px';

      // Wait for next render cycle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(ref.current, {
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      // Restore original styles
      ref.current.style.width = originalWidth;
      ref.current.style.height = originalHeight;
      setIsCapturing(false);
      
      return new Promise(resolve => {
        canvas.toBlob((blob: Blob | null) => {
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error(`Error capturing ${chartName} chart:`, error);
      setIsCapturing(false);
      return null;
    }
  };

  // Handle export with charts
  const handleExportWithCharts = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // Add CSV data
      const csvData = prepareExportData(sales, purchases, transfers);
      const csvString = csvData.map(row => 
        Object.values(row).join(',')
      ).join('\n');
      zip.file('trading_data.csv', csvString);
      
      // Capture and add charts
      const charts = [
        { ref: salesChartRef, name: 'sales_chart' },
        { ref: stockChartRef, name: 'stock_chart' },
        { ref: cashChartRef, name: 'cash_chart' }
      ];
      
      for (const chart of charts) {
        const blob = await captureChart(chart.ref, chart.name);
        if (blob) {
          zip.file(`${chart.name}.png`, blob);
        }
      }
      
      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'trading_data_with_charts.zip');
    } catch (error) {
      console.error('Error exporting data with charts:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle XLSX export
  const handleExportXLSX = async () => {
    setIsExporting(true);
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add transactions worksheet
      const transactionWS = XLSX.utils.json_to_sheet(transactionExportData);
      XLSX.utils.book_append_sheet(wb, transactionWS, 'Transactions');
      
      // Add sales data worksheet
      const salesWS = XLSX.utils.json_to_sheet(salesChartExportData);
      XLSX.utils.book_append_sheet(wb, salesWS, 'Sales Data');
      
      // Add stock data worksheet
      const stockWS = XLSX.utils.json_to_sheet(stockExportData);
      XLSX.utils.book_append_sheet(wb, stockWS, 'Stock Distribution');
      
      // Add cash data worksheet
      const cashWS = XLSX.utils.json_to_sheet(cashExportData);
      XLSX.utils.book_append_sheet(wb, cashWS, 'Cash Distribution');
      
      // Add summary worksheet
      const summaryData = [
        { Metric: 'Total Cash', Value: dashboardData.totalCash },
        { Metric: 'Net Sales', Value: dashboardData.netSales },
        { Metric: 'Net Purchases', Value: dashboardData.netPurchases },
        { Metric: 'Current Margin', Value: `${dashboardData.currentMargin}%` },
        { Metric: 'Required Margin', Value: `${dashboardData.requiredMargin}%` },
        { Metric: 'Sales Price Range', Value: dashboardData.salesPriceRange },
        { Metric: 'Buy Price Range', Value: `${dashboardData.buyPriceRange}%` }
      ];
      const summaryWS = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      
      // Save the workbook
      XLSX.writeFile(wb, 'trading_data.xlsx');
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Load data on first render
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepare sales data for chart with proper date formatting and sorting
  const salesChartData = statsData.salesByDay
    .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime())
    .map(day => ({
      date: new Date(day.isoDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      sales: day.amount,
      purchases: statsData.purchasesByDay.find(
        p => p.isoDate === day.isoDate
      )?.amount || 0
    }));

  // If no data, provide empty array with last 14 days
  const defaultChartData = salesChartData.length > 0 ? salesChartData : 
    Array.from({ length: 14 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: 0,
        purchases: 0
      };
    });

  // Prepare data for pie charts with proper filtering and sorting
  const stockPieData = dashboardData.stockList
    .filter(stock => stock.quantity !== 0)
    .sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity))
    .map(stock => ({
      name: stock.platform,
      value: Math.abs(stock.quantity)
    }));

  const cashPieData = dashboardData.cashList
    .filter(cash => cash.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .map(cash => ({
      name: cash.bank,
      value: Math.abs(cash.amount)
    }));

  // Prepare export data
  const transactionExportData = prepareExportData(sales, purchases, transfers);
  const transactionExportHeaders = [
    { label: "Type", key: "type" },
    { label: "Order Number", key: "orderNumber" },
    { label: "Bank", key: "bank" },
    { label: "Platform", key: "platform" },
    { label: "Total Price", key: "totalPrice" },
    { label: "Price", key: "price" },
    { label: "Quantity", key: "quantity" },
    { label: "Name", key: "name" },
    { label: "Contact No", key: "contactNo" },
    { label: "Created At", key: "createdAt" },
    { label: "Edited By", key: "editedBy" },
    { label: "Updated At", key: "updatedAt" }
  ];

  // Prepare sales chart data for export
  const salesChartExportData = statsData.salesByDay.map(day => ({
    date: day.date,
    amount: day.amount
  }));

  const salesChartExportHeaders = [
    { label: "Date", key: "date" },
    { label: "Sales Amount", key: "amount" }
  ];

  // Prepare stock distribution data for export
  const stockExportData = dashboardData.stockList.map(stock => ({
    platform: stock.platform,
    quantity: stock.quantity
  }));

  const stockExportHeaders = [
    { label: "Platform", key: "platform" },
    { label: "Quantity", key: "quantity" }
  ];

  // Prepare cash distribution data for export
  const cashExportData = dashboardData.cashList.map(cash => ({
    bank: cash.bank,
    amount: cash.amount
  }));

  const cashExportHeaders = [
    { label: "Bank", key: "bank" },
    { label: "Amount", key: "amount" }
  ];

  // Add at the top with other state declarations
  const lastTooltipIndex = useRef<number>(0);

  // Add these state variables to the Dashboard component after the existing ones
  const [stockUpdateOpen, setStockUpdateOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [newStockBalance, setNewStockBalance] = useState('');
  const [cashUpdateOpen, setCashUpdateOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [newCashBalance, setNewCashBalance] = useState('');
  const [, updateStockBalance] = useAtom(updateStockBalanceAtom);
  const [, updateCashBalance] = useAtom(updateCashBalanceAtom);

  // Add these functions to handle manual updates
  const handleStockUpdateOpen = (platform: string, currentQuantity: number) => {
    setSelectedPlatform(platform);
    setNewStockBalance(currentQuantity.toString());
    setStockUpdateOpen(true);
  };

  const handleCashUpdateOpen = (bank: string, currentAmount: number) => {
    setSelectedBank(bank);
    setNewCashBalance(currentAmount.toString());
    setCashUpdateOpen(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedPlatform || isNaN(Number(newStockBalance))) {
      console.log("Invalid input");
      return;
    }

    try {
      console.log(`Attempting to update ${selectedPlatform} stock to ${newStockBalance}...`);
      
      await updateStockBalance({
        platform: selectedPlatform,
        quantity: Number(newStockBalance)
      });
      
      console.log(`${selectedPlatform} stock has been updated successfully.`);
      
      // Force refresh data from backend to verify the update
      setStockUpdateOpen(false);
      console.log("Refreshing data to verify update...");
      await handleRefresh();
      console.log("Data refresh complete");
    } catch (error) {
      console.log("Failed to update stock balance:", error);
    }
  };

  const handleCashUpdate = async () => {
    if (!selectedBank || isNaN(Number(newCashBalance))) {
      console.log("Invalid input");
      return;
    }

    try {
      console.log(`Attempting to update ${selectedBank} balance to ${newCashBalance}...`);
      
      await updateCashBalance({
        bank: selectedBank,
        amount: Number(newCashBalance)
      });
      
      console.log(`${selectedBank} balance has been updated successfully.`);
      
      // Force refresh data from backend to verify the update
      setCashUpdateOpen(false);
      console.log("Refreshing data to verify update...");
      await handleRefresh();
      console.log("Data refresh complete");
    } catch (error) {
      console.log("Failed to update cash balance:", error);
    }
  };

  // Add this line near the top of the Dashboard component where other state declarations are
  const [dateRange] = useAtom(dateRangeAtom);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header with user info and refresh button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Terminal Dashboard</h1>
          <p className="text-gray-500">Welcome back, {authState.user?.email?.split('@')[0] || 'User'}!</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportXLSX}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportWithCharts}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export ZIP & Charts
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
      
      {/* Dashboard tabs */}
      <div className="flex border-b mb-6">
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'stock' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock Management
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'cash' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('cash')}
        >
          Cash Flow
        </button>
      </div>
      
      {activeTab === 'overview' && (
        <>
          {/* Main metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  Sales Price Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <p className="text-2xl font-bold">{`USDT ${dashboardData.salesPriceRange}`}</p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                      onClick={() => setSettingsOpen(true)}
                    >
                      Update USD Price
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
        
        <DashboardCard 
          title="Total Cash" 
          value={formatCurrency(dashboardData.totalCash)}
          secondaryValue={formatCurrency(dashboardData.totalCashAlt)}
          trend="up"
              icon={<DatabaseIcon className="h-4 w-4 text-green-500" />}
            />
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <ArrowDownUp className="h-4 w-4 text-orange-500" />
                  Buy Price Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <p className="text-2xl font-bold">{`${dashboardData.buyPriceRange}%`}</p>
                  <p className="text-sm text-gray-500">{`OTHER COINS ${dashboardData.buyPriceRangeAlt}`}</p>
                  <div className="text-xs text-gray-400">
                    Based on current USD price: {settings.currentUsdPrice || 'Not set'}
                  </div>
                </div>
              </CardContent>
            </Card>
        
        <DashboardCard 
          title="Current Margin" 
          value={`${dashboardData.currentMargin}%`}
          secondaryValue={`Required: ${dashboardData.requiredMargin}%`}
          trend={marginStatus}
          valueClassName={marginStatus === 'up' ? 'text-green-600' : 'text-red-600'}
              icon={<BarChart2 className="h-4 w-4 text-purple-500" />}
            />
          </div>
          
          {/* Net Cash */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <DashboardCard 
              title="Net Cash" 
              value={formatCurrency(dashboardData.netCash)}
              trend={dashboardData.netCash >= 0 ? 'up' : 'down'}
              className="h-full"
              icon={<DatabaseIcon className="h-4 w-4 text-blue-500" />}
            />
            
            <DashboardCard 
              title="Net Cash After Sales Started in POS" 
              value={formatCurrency(dashboardData.netCashAfterSales)}
              trend={dashboardData.netCashAfterSales >= 0 ? 'up' : 'down'}
              className="h-full"
              icon={<DatabaseIcon className="h-4 w-4 text-green-500" />}
        />
      </div>
      
          {/* Terminal metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">●</span> Sales & Purchases
                  </div>
                  <div className="text-sm font-normal text-gray-500">
                    Last 14 days
                  </div>
                </CardTitle>
          </CardHeader>
          <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={defaultChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        style={{ fontSize: '0.75rem' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value/1000}k`}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        style={{ fontSize: '0.75rem' }}
                      />
                      <Tooltip 
                        formatter={(value, name: string) => [
                          formatCurrency(Number(value)), 
                          name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{
                          padding: '4px 0',
                          color: '#374151'
                        }}
                        labelStyle={{
                          marginBottom: '4px',
                          fontWeight: 'bold',
                          color: '#111827'
                        }}
                        cursor={{ strokeDasharray: '3 3' }}
                        wrapperStyle={{
                          outline: 'none'
                        }}
                        isAnimationActive={false}
                        active={isCapturing ? true : undefined}
                      />
                      <Bar 
                        dataKey="purchases" 
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                        name="Purchases"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: 'white' }}
                        activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                        name="Sales"
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">●</span> Cash Distribution
                  </div>
                  <div className="text-sm font-normal text-gray-500">
                    By Bank
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cashPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {cashPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name: string) => [
                          formatCurrency(Number(value)), 
                          name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                        ]} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
          </div>
        </>
      )}
        
      {activeTab === 'stock' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Stock Inventory</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedPlatform('');
                    setNewStockBalance('0');
                    setStockUpdateOpen(true);
                  }}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Stock
                </Button>
          </CardHeader>
          <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left font-medium text-gray-500">Platform</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Quantity</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Status</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.stockList.map((stock, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{stock.platform}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatQuantity(stock.quantity)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                              stock.quantity > 0 
                              ? 'bg-green-100 text-green-800' 
                              : stock.quantity < 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                              {stock.quantity > 0 ? 'In Stock' : stock.quantity < 0 ? 'Overdrawn' : 'Empty'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleStockUpdateOpen(stock.platform, stock.quantity)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Stock Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {stockPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name: string) => [
                          formatCurrency(Number(value)), 
                          name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                        ]} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
      
      {activeTab === 'cash' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cash Balances</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedBank('');
                    setNewCashBalance('0');
                    setCashUpdateOpen(true);
                  }}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Cash Account
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left font-medium text-gray-500">Bank</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Amount</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.cashList.map((cash, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{cash.bank}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(cash.amount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCashUpdateOpen(cash.bank, cash.amount)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="py-3 px-4 font-bold">Total</td>
                        <td className="py-3 px-4 text-right font-bold">
                          {formatCurrency(dashboardData.totalCash)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
            </div>
          </CardContent>
        </Card>
        
            <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
                <CardTitle>Cash Distribution</CardTitle>
          </CardHeader>
          <CardContent>
                <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cashPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {cashPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name: string) => [
                          formatCurrency(Number(value)), 
                          name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                        ]} 
                      />
                    </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
      
      {/* Charts section */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales & Purchases Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={salesChartRef} className="h-80" id="sales-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={salesChartData}
                    onMouseMove={(data) => {
                      if (data && data.activeTooltipIndex !== undefined) {
                        lastTooltipIndex.current = data.activeTooltipIndex;
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value/1000}k`}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      style={{ fontSize: '0.75rem' }}
                    />
                    <Tooltip 
                      formatter={(value, name: string) => [
                        formatCurrency(Number(value)), 
                        name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      itemStyle={{
                        padding: '4px 0',
                        color: '#374151'
                      }}
                      labelStyle={{
                        marginBottom: '4px',
                        fontWeight: 'bold',
                        color: '#111827'
                      }}
                      cursor={{ strokeDasharray: '3 3' }}
                      wrapperStyle={{
                        outline: 'none'
                      }}
                      isAnimationActive={false}
                      active={isCapturing ? true : undefined}
                    />
                    <Bar 
                      dataKey="purchases" 
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      name="Purchases"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: 'white' }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                      name="Sales"
                      isAnimationActive={false}
                    />
                  </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
              <CardTitle>Stock Distribution</CardTitle>
          </CardHeader>
          <CardContent>
              <div ref={stockChartRef} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.stockList.filter(s => s.quantity > 0)}
                      dataKey="quantity"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ platform, quantity }) => `${platform}: ${formatQuantity(quantity)}`}
                    >
                      {dashboardData.stockList.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
            </div>
      )}

      {activeTab === 'cash' && (
        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={cashChartRef} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.cashList}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bank" />
                  <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="amount" fill={colors[0]} name="Amount">
                      {dashboardData.cashList.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Settings Modal */}
      <ErrorBoundary>
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </ErrorBoundary>

      {/* Stock Update Modal */}
      <Dialog open={stockUpdateOpen} onOpenChange={setStockUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock Balance</DialogTitle>
            <DialogDescription>
              Enter the new stock quantity for the selected platform.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="platform" className="text-right">
                Platform
              </Label>
              <div className="col-span-3">
                {selectedPlatform ? (
                  <Input
                    id="platform"
                    value={selectedPlatform}
                    disabled
                  />
                ) : (
                  <select
                    id="platform"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="" disabled>Select platform</option>
                    <option value="BINANCE AS">BINANCE AS</option>
                    <option value="BYBIT AS">BYBIT AS</option>
                    <option value="BITGET AS">BITGET AS</option>
                    <option value="KUCOIN AS">KUCOIN AS</option>
                    <option value="BINANCE SS">BINANCE SS</option>
                    <option value="BYBIT SS">BYBIT SS</option>
                    <option value="BITGET SS">BITGET SS</option>
                    <option value="KUCOIN SS">KUCOIN SS</option>
                  </select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={newStockBalance}
                onChange={(e) => setNewStockBalance(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockUpdateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate}>
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cash Update Modal */}
      <Dialog open={cashUpdateOpen} onOpenChange={setCashUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Cash Balance</DialogTitle>
            <DialogDescription>
              Enter the new cash amount for the selected bank account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bank" className="text-right">
                Bank
              </Label>
              <div className="col-span-3">
                {selectedBank ? (
                  <Input
                    id="bank"
                    value={selectedBank}
                    disabled
                  />
                ) : (
                  <select
                    id="bank"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="" disabled>Select bank</option>
                    <option value="IDBI">IDBI</option>
                    <option value="INDUSIND SS">INDUSIND SS</option>
                    <option value="HDFC CAA SS">HDFC CAA SS</option>
                    <option value="BOB SS">BOB SS</option>
                    <option value="CANARA SS">CANARA SS</option>
                    <option value="HDFC SS">HDFC SS</option>
                    <option value="INDUSIND BLYNK">INDUSIND BLYNK</option>
                    <option value="PNB">PNB</option>
                  </select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={newCashBalance}
                onChange={(e) => setNewCashBalance(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashUpdateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCashUpdate}>
              Update Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;