import React from 'react';
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
  Legend
} from 'recharts';
import { dashboardDataAtom } from '../store/data';
import DashboardCard from '../components/layout/dashboard-card';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency, formatQuantity } from '../lib/utils';

const Dashboard = () => {
  const [dashboardData] = useAtom(dashboardDataAtom);
  
  // Generate colors for cash distribution
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#F97316'];
  
  // Calculate margin status
  const marginStatus = dashboardData.currentMargin >= dashboardData.requiredMargin ? 'up' : 'down';

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Trading Terminal Dashboard</h1>
      
      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard 
          title="Sales Price Range" 
          value={`USDT ${dashboardData.salesPriceRange}`}
          trend="neutral"
        />
        
        <DashboardCard 
          title="Total Cash" 
          value={formatCurrency(dashboardData.totalCash)}
          secondaryValue={formatCurrency(dashboardData.totalCashAlt)}
          trend="up"
        />
        
        <DashboardCard 
          title="Buy Price Range" 
          value={`USDT ${dashboardData.buyPriceRange}`}
          secondaryValue={`OTHER COINS ${dashboardData.buyPriceRangeAlt}`}
          trend="neutral"
        />
        
        <DashboardCard 
          title="Current Margin" 
          value={`${dashboardData.currentMargin}%`}
          secondaryValue={`Required: ${dashboardData.requiredMargin}%`}
          trend={marginStatus}
          valueClassName={marginStatus === 'up' ? 'text-green-600' : 'text-red-600'}
        />
      </div>
      
      {/* Stock list and Cash list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {dashboardData.stockList.map((stock, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                  <span className="font-medium">{stock.platform}</span>
                  <span className={`font-bold ${stock.quantity > 0 ? 'text-green-600' : stock.quantity < 0 ? 'text-red-600' : ''}`}>
                    {formatQuantity(stock.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cash List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {dashboardData.cashList.map((cash, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                  <span className="font-medium">{cash.bank}</span>
                  <span className="font-bold">{formatCurrency(cash.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Terminal metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Terminal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-4">
              {formatCurrency(dashboardData.netSales)}
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { day: '1', amount: 25000 },
                  { day: '2', amount: 20000 },
                  { day: '3', amount: 20000 },
                  { day: '4', amount: 38000 },
                  { day: '5', amount: 65000 },
                  { day: '6', amount: 40000 },
                  { day: '7', amount: 45000 },
                  { day: '8', amount: 50000 },
                  { day: '9', amount: 65000 },
                  { day: '10', amount: 95000 },
                  { day: '11', amount: 60000 },
                  { day: '12', amount: 45000 },
                  { day: '13', amount: 15000 },
                  { day: '14', amount: 10000 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Purchase Terminal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-4">
              {formatCurrency(dashboardData.netPurchases)}
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.cashList}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bank" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="amount" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Net Cash */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard 
          title="Net Cash" 
          value={formatCurrency(dashboardData.netCash)}
          trend={dashboardData.netCash >= 0 ? 'up' : 'down'}
          className="h-full"
        />
        
        <DashboardCard 
          title="Net Cash After Sales Started in POS" 
          value={formatCurrency(dashboardData.netCashAfterSales)}
          trend={dashboardData.netCashAfterSales >= 0 ? 'up' : 'down'}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default Dashboard;