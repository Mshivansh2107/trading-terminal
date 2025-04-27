import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
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
  Cell
} from 'recharts';
import { dashboardDataAtom, refreshDataAtom, statsDataAtom, settingsAtom } from '../store/data';
import DashboardCard from '../components/layout/dashboard-card';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency, formatQuantity } from '../lib/utils';
import { 
  ArrowDownUp, 
  RefreshCw, 
  DollarSign,
  BarChart2,
  Settings,
  DatabaseIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { authStateAtom } from '../store/supabaseAuth';
import SettingsModal from '../components/settings-modal';

const Dashboard = () => {
  const [dashboardData] = useAtom(dashboardDataAtom);
  const [statsData] = useAtom(statsDataAtom);
  const [authState] = useAtom(authStateAtom);
  const [settings] = useAtom(settingsAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'cash'>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
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

  // Load data on first render
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepare sales data for chart
  const salesByDay = statsData.salesByDay.map(day => {
    // Parse the ISO date string
    const date = new Date(day.isoDate);
    return {
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: day.amount
    };
  });
  
  // If no data, provide empty array
  const salesChartData = salesByDay.length > 0 ? salesByDay : Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: 0
    };
  }).reverse();

  // Prepare data for pie charts
  const stockPieData = dashboardData.stockList
    .filter(stock => stock.quantity > 0)
    .map(stock => ({
      name: stock.platform,
      value: stock.quantity
    }));

  const cashPieData = dashboardData.cashList
    .filter(cash => cash.amount > 0)
    .map(cash => ({
      name: cash.bank,
      value: cash.amount
    }));

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header with user info and refresh button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Terminal Dashboard</h1>
          <p className="text-gray-500">Welcome back, {authState.user?.email?.split('@')[0] || 'User'}!</p>
        </div>
        
        <div className="flex items-center gap-2">
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
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <span className="text-green-500">●</span> Sales Terminal 
                  <span className="ml-auto text-xl font-bold text-green-600">{formatCurrency(dashboardData.netSales)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
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
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Sales']} />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        name="Sales"
                        stroke="#10B981" 
                        strokeWidth={2} 
                        dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: 'white' }}
                        activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <span className="text-blue-500">●</span> Purchase Terminal
                  <span className="ml-auto text-xl font-bold text-blue-600">{formatCurrency(dashboardData.netPurchases)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.cashList.filter(item => item.amount > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="bank" 
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
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                      <Bar 
                        dataKey="amount" 
                        fill="#3B82F6" 
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      >
                        {dashboardData.cashList.filter(item => item.amount > 0).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
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
              <CardHeader>
                <CardTitle>Stock Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left font-medium text-gray-500">Platform</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Quantity</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Status</th>
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
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {stockPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatQuantity(Number(value)), 'Quantity']} />
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
              <CardHeader>
                <CardTitle>Cash Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left font-medium text-gray-500">Bank</th>
                        <th className="py-2 px-4 text-right font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.cashList.map((cash, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{cash.bank}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(cash.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="py-3 px-4 font-bold">Total</td>
                        <td className="py-3 px-4 text-right font-bold">
                          {formatCurrency(dashboardData.totalCash)}
                        </td>
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
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {cashPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Dashboard;