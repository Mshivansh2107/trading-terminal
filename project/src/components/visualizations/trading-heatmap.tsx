import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatQuantity } from '../../lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

// Use React's lazy loading instead
const ApexChart = lazy(() => import('react-apexcharts'));

type TradingHeatmapProps = {
  data: Array<{
    platform: string;
    createdAt: Date;
    quantity: number;
  }>;
  title?: string;
  className?: string;
  selectedDate?: Date; // Optional external date control
  showDatePicker?: boolean; // Whether to show the date picker
};

const TradingHeatmap: React.FC<TradingHeatmapProps> = ({
  data,
  title = 'Trading Activity Heatmap',
  className = '',
  selectedDate: externalDate,
  showDatePicker = true,
}) => {
  // Use internal date state if no external date is provided
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  
  // Use external date if provided, otherwise use internal date
  const selectedDate = externalDate || internalDate;
  
  // Generate heatmap data for the selected day
  const { heatmapData, categories, series } = useMemo(() => {
    const heatmapData: Record<string, Record<string, number>> = {};
    const uniquePlatforms = new Set<string>();

    // Initialize empty data structure
    data.forEach(item => {
      uniquePlatforms.add(item.platform);
    });

    // Generate hourly slots for the day
    const hourlySlots: string[] = [];
    for (let i = 0; i < 24; i++) {
      hourlySlots.push(`${i}:00`);
    }

    // Initialize data structure with zeros
    uniquePlatforms.forEach(platform => {
      heatmapData[platform] = {};
      hourlySlots.forEach(slot => {
        heatmapData[platform][slot] = 0;
      });
    });

    // Filter data for the selected day and process it
    data.filter(item => {
      const itemDate = new Date(item.createdAt);
      return (
        itemDate.getFullYear() === selectedDate.getFullYear() &&
        itemDate.getMonth() === selectedDate.getMonth() &&
        itemDate.getDate() === selectedDate.getDate()
      );
    }).forEach(item => {
      const date = new Date(item.createdAt);
      const hourSlot = `${date.getHours()}:00`;

      if (heatmapData[item.platform] && heatmapData[item.platform][hourSlot] !== undefined) {
        heatmapData[item.platform][hourSlot] += item.quantity;
      }
    });

    // Convert to ApexCharts format
    const platforms = Array.from(uniquePlatforms);
    const series = platforms.map(platform => ({
      name: platform,
      data: hourlySlots.map(slot => ({
        x: slot,
        y: heatmapData[platform][slot] || 0
      }))
    }));

    return {
      heatmapData,
      categories: hourlySlots,
      series
    };
  }, [data, selectedDate]);

  // Chart options
  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: 'heatmap',
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
      dataLabels: {
        enabled: false
      },
      colors: ["#008FFB"],
      title: {
        text: title ? `${title}` : '', // Don't include date in title anymore as it's handled outside
      },
      tooltip: {
        enabled: true,
        custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
          const value = series[seriesIndex][dataPointIndex];
          const hour = w.globals.labels[dataPointIndex];
          const platform = w.globals.seriesNames[seriesIndex];
          
          return `
            <div class="custom-tooltip">
              <div style="font-weight: bold; margin-bottom: 5px;">${hour}</div>
              <div>
                <span>${platform}: </span>
                <span style="font-weight: bold;">${formatQuantity(value)}</span>
              </div>
            </div>
          `;
        }
      },
      xaxis: {
        type: 'category',
        categories: categories,
        labels: {
          style: {
            fontSize: '12px'
          }
        },
        tooltip: {
          enabled: false
        }
      },
      yaxis: {
        tooltip: {
          enabled: false
        }
      },
      plotOptions: {
        heatmap: {
          radius: 0,
          enableShades: true,
          colorScale: {
            ranges: [
              {
                from: 0,
                to: 0,
                color: '#ebedf0',
                name: 'No activity',
              },
              {
                from: 0.1,
                to: 10,
                color: '#c6e48b',
                name: 'Low activity',
              },
              {
                from: 10.1,
                to: 50,
                color: '#7bc96f',
                name: 'Medium activity',
              },
              {
                from: 50.1,
                to: 100,
                color: '#239a3b',
                name: 'High activity',
              },
              {
                from: 100.1,
                to: 1000000,
                color: '#196127',
                name: 'Very high activity',
              },
            ],
          },
        },
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 350
            }
          }
        }
      ]
    };
  }, [categories, title]);

  return (
    <div className={`w-full ${className}`}>
      {showDatePicker && (
        <div className="flex justify-end mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'MMMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setInternalDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="w-full h-[400px] sm:h-[500px]">
        {typeof window !== 'undefined' && (
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading chart...</div>}>
            <ApexChart
              options={chartOptions}
              series={series}
              type="heatmap"
              height="100%"
              width="100%"
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default TradingHeatmap;