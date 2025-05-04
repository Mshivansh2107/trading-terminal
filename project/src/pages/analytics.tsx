import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { 
  transfersAtom, 
  salesAtom, 
  purchasesAtom, 
  expensesAtom,
  refreshDataAtom
} from '../store/data';
import TradingHeatmap from '../components/visualizations/trading-heatmap';
import PlatformRadarChart from '../components/visualizations/platform-radar-chart';
import { filterByDateAtom, dateRangeAtom } from '../store/filters';
import DateRangeFilter from '../components/date-range-filter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Button } from '../components/ui/button';

// Updated to share date selection
const Analytics = () => {
  const [transfers] = useAtom(transfersAtom);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [expenses] = useAtom(expensesAtom);
  
  const [, refreshData] = useAtom(refreshDataAtom);
  
  const [filterByDate] = useAtom(filterByDateAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  
  // Shared state for selected date across all heatmaps
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Fetch all data when component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Filter data by date range
  const filteredTransfers = filterByDate(transfers);
  const filteredSales = filterByDate(sales);
  const filteredPurchases = filterByDate(purchases);
  const filteredExpenses = filterByDate(expenses);
  
  // Transform data for the heatmap visualization
  const transfersData = filteredTransfers.map(transfer => ({
    platform: transfer.from, // Using "from" platform for this example
    createdAt: new Date(transfer.createdAt),
    quantity: transfer.quantity
  }));
  
  const salesData = filteredSales.map(sale => ({
    platform: sale.platform,
    createdAt: new Date(sale.createdAt),
    quantity: sale.quantity
  }));
  
  const purchasesData = filteredPurchases.map(purchase => ({
    platform: purchase.platform,
    createdAt: new Date(purchase.createdAt),
    quantity: purchase.quantity
  }));
  
  // Combine all transaction types for an overall activity heatmap
  const allActivityData = [
    ...transfersData,
    ...salesData,
    ...purchasesData,
  ];
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex items-center gap-4">
          {/* Single shared date selector for all heatmaps */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[200px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'MMMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <DateRangeFilter />
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Overall Activity Heatmap */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Overall Trading Activity - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingHeatmap 
              data={allActivityData} 
              selectedDate={selectedDate}
              showDatePicker={false}
            />
          </CardContent>
        </Card>
        
        {/* Individual Activity Heatmaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Activity - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingHeatmap 
                data={transfersData} 
                selectedDate={selectedDate}
                showDatePicker={false}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sales Activity - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingHeatmap 
                data={salesData} 
                selectedDate={selectedDate}
                showDatePicker={false}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Purchase Activity - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingHeatmap 
                data={purchasesData} 
                selectedDate={selectedDate}
                showDatePicker={false}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformRadarChart 
                data={{
                  sales: filteredSales,
                  purchases: filteredPurchases
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 