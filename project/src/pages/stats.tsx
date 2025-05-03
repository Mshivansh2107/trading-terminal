import React, { useEffect } from 'react';
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
  ResponsiveContainer 
} from 'recharts';
import { statsDataAtom, dashboardDataAtom } from '../store/data';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';
import DateRangeFilter from '../components/date-range-filter';
import { dateRangeAtom, isSingleDaySelectionAtom, formatDateByRangeAtom } from '../store/filters';

const Stats = () => {
  const [statsData] = useAtom(statsDataAtom);
  const [dashboardData] = useAtom(dashboardDataAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [isSingleDay] = useAtom(isSingleDaySelectionAtom);
  const [formatDateByRange] = useAtom(formatDateByRangeAtom);
  
  // Ensure stats update when date range changes
  useEffect(() => {
    // statsData and dashboardData are reactive and will recalculate
    // automatically when dateRange changes
    console.log("Date range updated, stats will refresh automatically");
  }, [dateRange]);
  
  // Function to determine if we should display hourly view
  // Only show hourly view when a single day is selected AND date filtering is active
  const shouldShowHourlyView = dateRange.isActive && isSingleDay;
  
  // Generate pie chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  
  // Use sales data from the stats atom
  const salesByDayData = statsData.salesByDay;
  
  // Use purchases data from the stats atom
  const purchasesByDayData = statsData.purchasesByDay;
  
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Statistics Dashboard</h1>
        <DateRangeFilter />
      </div>
      
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
        
        <Card>
          <CardHeader>
            <CardTitle>Margin Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marginData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    label={{ value: shouldShowHourlyView ? "Time" : "Date", position: "insideBottomRight", offset: -5 }}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="margin" 
                    name="Margin %" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Current Margin</div>
                <div className={`text-lg font-bold ${dashboardData.currentMargin >= dashboardData.requiredMargin ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardData.currentMargin}%
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Required Margin</div>
                <div className="text-lg font-bold text-blue-600">
                  {dashboardData.requiredMargin}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
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
                <Bar dataKey="profit" name="Profit" fill="#F59E0B" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader>
            <CardTitle>Current Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-2 ${dashboardData.currentMargin >= dashboardData.requiredMargin ? 'text-green-600' : 'text-red-600'}`}>
              {dashboardData.currentMargin}%
            </div>
            <p className="text-sm text-gray-600">
              {dashboardData.currentMargin >= dashboardData.requiredMargin 
                ? `Exceeding target by ${(dashboardData.currentMargin - dashboardData.requiredMargin).toFixed(2)}%`
                : `Below target by ${(dashboardData.requiredMargin - dashboardData.currentMargin).toFixed(2)}%`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;