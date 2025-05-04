import React, { useMemo, lazy, Suspense } from 'react';
import { formatQuantity } from '../../lib/utils';

// Use React's lazy loading instead
const ApexChart = lazy(() => import('react-apexcharts'));

type RadarMetrics = {
  platform: string;
  transactionVolume: number;
  averageSize: number;
  frequency: number;
  profitMargin: number;
  growth: number;
};

type PlatformRadarChartProps = {
  data: {
    sales: Array<{
      platform: string;
      quantity: number;
      totalPrice: number;
      price: number;
      createdAt: Date;
    }>;
    purchases: Array<{
      platform: string;
      quantity: number;
      totalPrice: number;
      price: number;
      createdAt: Date;
    }>;
  };
  className?: string;
  selectedDate?: Date;
};

const PlatformRadarChart: React.FC<PlatformRadarChartProps> = ({
  data,
  className = '',
  selectedDate,
}) => {
  // Calculate metrics for the radar chart
  const { platforms, radarData, series } = useMemo(() => {
    const platformsSet = new Set<string>();
    
    // Extract all unique platform names
    data.sales.forEach(sale => platformsSet.add(sale.platform));
    data.purchases.forEach(purchase => platformsSet.add(purchase.platform));
    
    // Convert to array
    const platformsList = Array.from(platformsSet);
    
    // Calculate metrics for each platform
    const metrics: RadarMetrics[] = platformsList.map(platform => {
      // Filter data for this platform
      const platformSales = data.sales.filter(sale => sale.platform === platform);
      const platformPurchases = data.purchases.filter(purchase => purchase.platform === platform);
      
      // Calculate total volume (sum of quantities)
      const salesVolume = platformSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const purchasesVolume = platformPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
      const transactionVolume = salesVolume + purchasesVolume;
      
      // Calculate average transaction size
      const totalTransactions = platformSales.length + platformPurchases.length;
      const averageSize = totalTransactions > 0 
        ? (salesVolume + purchasesVolume) / totalTransactions 
        : 0;
      
      // Calculate transaction frequency (transactions per day)
      // Use the last 30 days for this calculation
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const recentSales = platformSales.filter(sale => 
        new Date(sale.createdAt) >= thirtyDaysAgo
      );
      
      const recentPurchases = platformPurchases.filter(purchase => 
        new Date(purchase.createdAt) >= thirtyDaysAgo
      );
      
      const frequency = (recentSales.length + recentPurchases.length) / 30;
      
      // Calculate profit margin
      const totalSalesRevenue = platformSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
      const totalPurchaseCost = platformPurchases.reduce((sum, purchase) => sum + purchase.totalPrice, 0);
      
      // Avoid division by zero
      const profitMargin = totalPurchaseCost > 0 
        ? ((totalSalesRevenue - totalPurchaseCost) / totalPurchaseCost) * 100
        : 0;
      
      // Calculate growth (compare current 15 days to previous 15 days)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(now.getDate() - 15);
      
      const thirtyToFifteenDaysAgo = new Date();
      thirtyToFifteenDaysAgo.setDate(now.getDate() - 30);
      
      // Current period transactions
      const currentPeriodSales = platformSales.filter(sale => 
        new Date(sale.createdAt) >= fifteenDaysAgo
      );
      
      const currentPeriodPurchases = platformPurchases.filter(purchase => 
        new Date(purchase.createdAt) >= fifteenDaysAgo
      );
      
      // Previous period transactions
      const previousPeriodSales = platformSales.filter(sale => 
        new Date(sale.createdAt) >= thirtyToFifteenDaysAgo && 
        new Date(sale.createdAt) < fifteenDaysAgo
      );
      
      const previousPeriodPurchases = platformPurchases.filter(purchase => 
        new Date(purchase.createdAt) >= thirtyToFifteenDaysAgo && 
        new Date(purchase.createdAt) < fifteenDaysAgo
      );
      
      const currentPeriodVolume = 
        currentPeriodSales.reduce((sum, sale) => sum + sale.quantity, 0) +
        currentPeriodPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
      
      const previousPeriodVolume = 
        previousPeriodSales.reduce((sum, sale) => sum + sale.quantity, 0) +
        previousPeriodPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
      
      // Calculate growth rate (as a percentage)
      const growth = previousPeriodVolume > 0 
        ? ((currentPeriodVolume - previousPeriodVolume) / previousPeriodVolume) * 100
        : (currentPeriodVolume > 0 ? 100 : 0); // If previous was 0 and current > 0, 100% growth
      
      return {
        platform,
        transactionVolume,
        averageSize,
        frequency,
        profitMargin,
        growth
      };
    });
    
    // Filter out platforms with no activity (all zeros)
    const activeMetrics = metrics.filter(metric => 
      metric.transactionVolume > 0 || 
      metric.averageSize > 0 || 
      metric.frequency > 0 ||
      metric.profitMargin > 0 ||
      metric.growth > 0
    );
    
    // Normalize values for radar chart (0-100 scale)
    const normalizeValue = (value: number, max: number): number => {
      return max > 0 ? (value / max) * 100 : 0;
    };
    
    // Find max values for normalization
    const maxVolume = Math.max(...activeMetrics.map(m => m.transactionVolume));
    const maxAvgSize = Math.max(...activeMetrics.map(m => m.averageSize));
    const maxFrequency = Math.max(...activeMetrics.map(m => m.frequency));
    const maxProfitMargin = Math.max(...activeMetrics.map(m => Math.abs(m.profitMargin)));
    const maxGrowth = Math.max(...activeMetrics.map(m => Math.abs(m.growth)));
    
    // Create radar chart series data
    const series = activeMetrics.map(metric => ({
      name: metric.platform,
      data: [
        normalizeValue(metric.transactionVolume, maxVolume),
        normalizeValue(metric.averageSize, maxAvgSize),
        normalizeValue(metric.frequency, maxFrequency),
        normalizeValue(Math.max(0, metric.profitMargin), maxProfitMargin), // Ensure positive
        normalizeValue(Math.max(0, metric.growth), maxGrowth) // Ensure positive
      ]
    }));
    
    return {
      platforms: platformsList,
      radarData: activeMetrics,
      series
    };
  }, [data]);
  
  // Define chart options
  const chartOptions = useMemo(() => {
    return {
      chart: {
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        },
        fontFamily: 'inherit',
        background: 'transparent',
      },
      title: {
        text: 'Platform Performance Comparison',
        align: 'center',
      },
      xaxis: {
        categories: [
          'Transaction Volume', 
          'Average Size', 
          'Transaction Frequency', 
          'Profit Margin', 
          'Growth'
        ],
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const index = opts.dataPointIndex;
            const metric = radarData[opts.seriesIndex];
            
            // Return the actual value based on the category
            switch(index) {
              case 0: // Transaction Volume
                return `${formatQuantity(metric.transactionVolume)}`;
              case 1: // Average Size
                return `${formatQuantity(metric.averageSize)}`;
              case 2: // Frequency
                return `${metric.frequency.toFixed(2)} txns/day`;
              case 3: // Profit Margin
                return `${metric.profitMargin.toFixed(2)}%`;
              case 4: // Growth
                return `${metric.growth.toFixed(2)}%`;
              default:
                return val.toFixed(2);
            }
          }
        }
      },
      markers: {
        size: 4,
        hover: {
          size: 6
        }
      },
      theme: {
        palette: 'palette1'
      }
    };
  }, [radarData]);
  
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-[400px] sm:h-[500px]">
        {typeof window !== 'undefined' && series.length > 0 ? (
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading chart...</div>}>
            <ApexChart
              options={chartOptions}
              series={series}
              type="radar"
              height="100%"
              width="100%"
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500">No data available for radar chart</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformRadarChart; 