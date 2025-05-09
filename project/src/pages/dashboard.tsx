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
  ComposedChart,
  AreaChart,
  Area
} from 'recharts';
import { dashboardDataAtom, refreshDataAtom, statsDataAtom, settingsAtom, salesAtom, purchasesAtom, transfersAtom, updateStockBalanceAtom, updateCashBalanceAtom, banksAtom, platformsAtom, dataVersionAtom, updatePosSettingsAtom, posSettingsAtom } from '../store/data';
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
  Plus,
  Maximize2,
  Copy,
  Image,
  MoreHorizontal,
  Printer,
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { authStateAtom } from '../store/supabaseAuth';
import SettingsModal from '../components/settings-modal';
import ErrorBoundary from '../components/error-boundary';
import { CSVLink } from "react-csv";
import { Transaction, BankEntity } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CustomSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DateRangeFilter from '../components/date-range-filter';
import { dateRangeAtom, isSingleDaySelectionAtom, formatDateByRangeAtom } from '../store/filters';
import { PlatformSelector } from '../components/ui/platform-selector';
import { Legend } from 'recharts';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { Checkbox } from '../components/ui/checkbox';

const Dashboard = () => {
  const [dashboardData] = useAtom(dashboardDataAtom);
  const [statsData] = useAtom(statsDataAtom);
  const [authState] = useAtom(authStateAtom);
  const [settings] = useAtom(settingsAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [isSingleDay] = useAtom(isSingleDaySelectionAtom);
  const [formatDateByRange] = useAtom(formatDateByRangeAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'cash'>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [transfers] = useAtom(transfersAtom);
  const [banks] = useAtom(banksAtom);
  const [dataVersion] = useAtom(dataVersionAtom);
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  const [enlargedChart, setEnlargedChart] = useState<'stock' | 'cash' | null>(null);
  const [posSettings] = useAtom(posSettingsAtom);
  const [, updatePosSettings] = useAtom(updatePosSettingsAtom);
  const [posBankSelectOpen, setPosBankSelectOpen] = useState(false);

  // Refs for chart containers
  const salesChartRef = useRef<HTMLDivElement>(null);
  const stockChartRef = useRef<HTMLDivElement>(null);
  const cashChartRef = useRef<HTMLDivElement>(null); // Overview tab cash chart
  const cashTabChartRef = useRef<HTMLDivElement>(null); // Cash tab cash chart
  const enlargedChartRef = useRef<HTMLDivElement>(null); // Enlarged chart modal
  
  // Generate colors for charts
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#F97316'];
  
  // Calculate margin status
  const marginStatus = dashboardData.currentMargin >= dashboardData.requiredMargin ? 'up' : 'down';

  // Function to determine if we should display hourly view
  // Only show hourly view when a single day is selected AND date filtering is active
  const shouldShowHourlyView = dateRange.isActive && isSingleDay;

  // Handle data refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      console.log("Starting data refresh...");
      // Force a complete data refresh from the server
      await refreshData();
      
      // The dataVersionAtom will be incremented, which will trigger a UI update
      console.log("Data refresh complete, dataVersion:", dataVersion);
      
      // Brief delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Error refreshing data:", error);
      alert("Failed to refresh data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Improve the captureChart function to be more robust
  const captureChart = async (ref: React.RefObject<HTMLDivElement>, chartName: string): Promise<Blob | null> => {
    if (!ref.current) return null;
    
    try {
      // Store original styles
      const originalStyles = {
        width: ref.current.style.width,
        height: ref.current.style.height,
        position: ref.current.style.position,
        overflow: ref.current.style.overflow,
        zIndex: ref.current.style.zIndex
      };
      
      // Set capturing state
      setIsCapturing(true);
      
      // Create a clone of the original element to avoid modifying the visible UI
      const clone = ref.current.cloneNode(true) as HTMLDivElement;
      
      // Style the clone for optimal rendering
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      clone.style.width = '1200px'; // Use consistent size for export
      clone.style.height = '800px';
      clone.style.zIndex = '-1000';
      clone.style.overflow = 'visible';
      
      // Temporarily append to body
      document.body.appendChild(clone);

      // Wait for next render cycle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capture the clone instead of the original
      const canvas = await html2canvas(clone, {
        logging: false,
        useCORS: true,
        allowTaint: true,
        background: 'white',
        width: 1200,
        height: 800
      });
      
      // Clean up
      document.body.removeChild(clone);
      setIsCapturing(false);
      
      // Convert canvas to blob
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
        { ref: cashChartRef, name: 'overview_cash_chart' }, 
        { ref: cashTabChartRef, name: 'cash_tab_chart' }
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
    console.log("Dashboard loading - refreshing data...");
    // Check if connected to Supabase
    console.log("Current auth state:", authState);
    
    handleRefresh()
      .then(() => console.log("Initial data load complete"))
      .catch((error) => console.error("Error during initial data load:", error));
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data when data version changes
  useEffect(() => {
    if (dataVersion > 0) {
      console.log(`Data version changed to ${dataVersion}, UI will update with new data`);
    }
  }, [dataVersion]);

  // Refresh data when date range changes
  useEffect(() => {
    // Just accessing dashboardData and statsData is enough
    // since they are reactive and will recalculate when dateRange changes
    console.log("Date range changed, charts will update automatically");
  }, [dateRange]);

  // Prepare sales data for chart with proper date formatting and sorting
  const salesChartData = statsData.salesByDay
    .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime())
    .map(day => {
      let dateDisplay;
      if (shouldShowHourlyView) {
        // Extract just the hour:minute from the date string for hourly view
        const date = new Date(day.isoDate);
        dateDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        dateDisplay = new Date(day.isoDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      return {
        date: dateDisplay,
        sales: day.amount,
        purchases: statsData.purchasesByDay.find(
          p => p.isoDate === day.isoDate
        )?.amount || 0
      };
    });

  // If no data, provide empty array with last 14 days or 24 hours
  const defaultChartData = salesChartData.length > 0 ? salesChartData : 
    shouldShowHourlyView ? 
      // Create 24 hourly slots for a single day
      Array.from({ length: 24 }).map((_, i) => {
        const hour = i.toString().padStart(2, '0');
        return {
          date: `${hour}:00`,
          sales: 0,
          purchases: 0
        };
      }) : 
      // Create 14 daily slots for multi-day view
      Array.from({ length: 14 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: 0,
          purchases: 0
        };
      });

  // Update the code that creates hourly data points in statsDataAtom usage to ensure all 24 hours
  // Add this useEffect to sort and normalize salesChartData when it changes
  useEffect(() => {
    if (shouldShowHourlyView && salesChartData.length > 0) {
      // Ensure we have data points for all 24 hours
      const fullDayData = Array.from({ length: 24 }).map((_, hour) => {
        const hourStr = hour.toString().padStart(2, '0');
        const timeStr = `${hourStr}:00`;
        
        // Find existing data point for this hour
        const existingDataPoint = salesChartData.find(item => {
          // Try to match the hour part from the date string
          const itemHour = item.date.split(':')[0];
          return itemHour === hourStr;
        });
        
        return existingDataPoint || {
          date: timeStr,
          sales: 0,
          purchases: 0
        };
      });
      
      // Sort by hour
      fullDayData.sort((a, b) => {
        const hourA = parseInt(a.date.split(':')[0]);
        const hourB = parseInt(b.date.split(':')[0]);
        return hourA - hourB;
      });
      
      // We can't directly modify salesChartData as it's derived from statsData
      // But we can ensure defaultChartData uses the full day data when in single day mode
      // defaultChartData = fullDayData; // Can't reassign const
      // Instead, we'll use this data in the chart render
    }
  }, [salesChartData, shouldShowHourlyView]);

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
    { label: "Created By", key: "createdBy" },
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
      alert("Please enter a valid platform and quantity");
      return;
    }

    try {
      console.log(`Attempting to update ${selectedPlatform} stock to ${newStockBalance}...`);
      
      // Show feedback to the user
      alert(`Processing: Updating ${selectedPlatform} stock to ${newStockBalance}...`);
      
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
      
      // Show success message
      alert(`${selectedPlatform} stock has been successfully updated to ${newStockBalance}`);
    } catch (error) {
      console.error("Failed to update stock balance:", error);
      alert(`Error updating stock balance: ${error}`);
    }
  };

  const handleCashUpdate = async () => {
    if (!selectedBank || isNaN(Number(newCashBalance))) {
      console.log("Invalid input");
      alert("Please enter a valid bank and amount");
      return;
    }

    try {
      console.log(`Attempting to update ${selectedBank} balance to ${newCashBalance}...`);
      
      // Show feedback to the user
      alert(`Processing: Updating ${selectedBank} balance to ${newCashBalance}...`);
      
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
      
      // Show success message
      alert(`${selectedBank} balance has been successfully updated to ${newCashBalance}`);
    } catch (error) {
      console.error("Failed to update cash balance:", error);
      alert(`Error updating cash balance: ${error}`);
    }
  };

  // Add automated polling for data refresh
  useEffect(() => {
    // Check if user is authenticated before setting up polling
    if (!authState.isAuthenticated) {
      return;
    }
    
    console.log("Setting up auto-refresh polling");
    
    // Set up polling interval (refresh every 30 seconds)
    const polling = setInterval(() => {
      console.log("Auto-refresh: Polling for new data...");
      refreshData().catch(error => {
        console.error("Error during auto-refresh:", error);
      });
    }, 30000); // 30 seconds
    
    // Clean up interval on unmount
    return () => {
      console.log("Cleaning up auto-refresh polling");
      clearInterval(polling);
    };
  }, [authState.isAuthenticated, refreshData]);

  // Update the handleDownloadChart function to handle different formats
  const handleDownloadChart = async (chartRef: React.RefObject<HTMLDivElement>, filename: string, format: 'png' | 'clipboard' = 'png') => {
    try {
      setIsCapturing(true);
      const blob = await captureChart(chartRef, filename);
      
      if (!blob) return;
      
      if (format === 'clipboard') {
        try {
          // Create image data from blob for clipboard
          const imageData = await createImageBitmap(blob);
          
          // Try to copy to clipboard - this requires secure context
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({
              'image/png': blob
            });
            await navigator.clipboard.write([item]);
            // Show toast or notification
            alert('Chart copied to clipboard!');
          } else {
            // Fallback for browsers without clipboard API support
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert('Your browser does not support clipboard images. Chart downloaded instead.');
          }
        } catch (clipboardError) {
          console.error('Clipboard error:', clipboardError);
          // Fallback to download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } else {
        // Download as file
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error processing chart:', error);
      alert('Failed to export chart. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Add print chart function
  const handlePrintChart = async (chartRef: React.RefObject<HTMLDivElement>, title: string) => {
    try {
      setIsCapturing(true);
      const blob = await captureChart(chartRef, 'print.png');
      if (!blob) return;
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Pop-up blocked. Please allow pop-ups and try again.');
        return;
      }
      
      // Convert blob to data URL
      const reader = new FileReader();
      reader.onloadend = function() {
        const dataUrl = reader.result as string;
        
        // Get current date for footer
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const timeString = now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: 'numeric'
        });
        
        // Write HTML content to the new window
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Chart - ${title}</title>
              <style>
                body {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  padding: 20px;
                  font-family: Arial, sans-serif;
                  background-color: white;
                  color: #333;
                }
                .print-container {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  width: 100%;
                  max-width: 1000px;
                  margin: 0 auto;
                }
                .header {
                  width: 100%;
                  text-align: center;
                  margin-bottom: 20px;
                  padding-bottom: 10px;
                  border-bottom: 1px solid #e0e0e0;
                }
                h1 {
                  font-size: 24px;
                  margin-bottom: 10px;
                  color: #1e293b;
                }
                .logo {
                  font-size: 14px;
                  color: #64748b;
                  margin-bottom: 5px;
                }
                .chart-container {
                  width: 100%;
                  margin-bottom: 20px;
                  border: 1px solid #e0e0e0;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
                img {
                  width: 100%;
                  height: auto;
                  display: block;
                }
                .footer {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  font-size: 12px;
                  color: #64748b;
                  margin-top: 20px;
                  padding-top: 10px;
                  border-top: 1px solid #e0e0e0;
                }
                .actions {
                  display: flex;
                  gap: 10px;
                  margin-top: 20px;
                }
                button {
                  padding: 8px 16px;
                  background: #2563eb;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 14px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  transition: background-color 0.2s;
                }
                button:hover {
                  background: #1d4ed8;
                }
                button.secondary {
                  background: #f8fafc;
                  color: #334155;
                  border: 1px solid #cbd5e1;
                }
                button.secondary:hover {
                  background: #f1f5f9;
                }
                .button-icon {
                  width: 16px;
                  height: 16px;
                }
                @media print {
                  .actions, button { display: none; }
                  .chart-container {
                    border: none;
                    box-shadow: none;
                  }
                  body {
                    padding: 0;
                  }
                  .print-container {
                    width: 100%;
                    max-width: none;
                  }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                <div class="header">
                  <div class="logo">Trading Terminal</div>
                  <h1>${title}</h1>
                </div>
                
                <div class="chart-container">
                  <img src="${dataUrl}" alt="${title}">
                </div>
                
                <div class="footer">
                  <div>Generated: ${dateString} at ${timeString}</div>
                  <div>Trading Terminal Dashboard</div>
                </div>
                
                <div class="actions">
                  <button onclick="window.print();">
                    <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print Chart
                  </button>
                  <button class="secondary" onclick="window.close();">
                    Cancel
                  </button>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error preparing chart for print:', error);
      alert('Failed to prepare chart for printing. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

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
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <DatabaseIcon className="h-4 w-4 text-green-500" />
                    Net Cash After Sales Started in POS
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8" 
                    onClick={() => setPosBankSelectOpen(true)}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                {posSettings?.posActiveBanks && posSettings.posActiveBanks.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Includes: {posSettings.posActiveBanks.join(', ')}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <p className={`text-2xl font-bold ${dashboardData.netCashAfterSales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dashboardData.netCashAfterSales)}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs ${dashboardData.netCashAfterSales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.netCashAfterSales >= 0 ? '↑' : '↓'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    {shouldShowHourlyView ? 'Hourly View' : 'Daily View'}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 relative" ref={salesChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={defaultChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        style={{ fontSize: '0.75rem' }}
                        interval={shouldShowHourlyView ? 2 : 0}
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
                        labelFormatter={(label) => {
                          if (shouldShowHourlyView) {
                            return `Today at ${label}`;
                          }
                          return label;
                        }}
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
                      {shouldShowHourlyView ? (
                        <>
                          <Bar 
                            dataKey="purchases" 
                            fill="#3B82F6"
                            radius={[4, 4, 0, 0]}
                            barSize={10}
                            name="Purchases"
                          />
                          <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#10B981"
                            fill="#10B98133"
                            strokeWidth={2}
                            dot={{ stroke: '#10B981', strokeWidth: 2, r: 2, fill: 'white' }}
                            activeDot={{ r: 4, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                            name="Sales"
                            isAnimationActive={false}
                          />
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Chart Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadChart(salesChartRef, 'sales-chart.png')}>
                          <Image className="mr-2 h-4 w-4" />
                          Save as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadChart(salesChartRef, 'sales-chart.png', 'clipboard')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to Clipboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintChart(salesChartRef, 'Sales and Purchases Chart')}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Chart
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">●</span> Cash Distribution
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-normal text-gray-500">
                      By Bank
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEnlargedChart('cash')}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 lg:h-72 w-full relative" ref={cashChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <Pie
                        data={cashPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent }) => 
                          percent > 0.05 ? `${name.slice(0, 8)}${name.length > 8 ? '...' : ''}` : ''
                        }
                      >
                        {cashPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                            stroke="white"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name: string) => [
                          formatCurrency(Number(value)), 
                          name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{
                          fontSize: '12px',
                          paddingTop: '10px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Chart Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadChart(cashChartRef, 'overview-cash-distribution.png')}>
                          <Image className="mr-2 h-4 w-4" />
                          Save as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadChart(cashChartRef, 'overview-cash-distribution.png', 'clipboard')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to Clipboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintChart(cashChartRef, 'Cash Distribution')}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEnlargedChart('cash')}>
                          <Maximize2 className="mr-2 h-4 w-4" />
                          View Larger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                      <tr className="bg-gray-50">
                        <td className="py-3 px-4 font-bold">Total Stock Balances</td>
                        <td className="py-3 px-4 text-right font-bold">
                          {formatQuantity(dashboardData.totalStockBalances)}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
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
                <div className="h-64 md:h-80 lg:h-72 w-full relative" ref={stockChartRef}>
                  {/* Stock distribution chart */}
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <Pie
                        data={stockPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent }) => 
                          percent > 0.05 ? `${name.slice(0, 8)}${name.length > 8 ? '...' : ''}` : ''
                        }
                      >
                        {stockPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                            stroke="white"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [formatQuantity(Number(value)), name]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{
                          fontSize: '12px',
                          paddingTop: '10px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Chart Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadChart(stockChartRef, 'stock-distribution.png')}>
                          <Image className="mr-2 h-4 w-4" />
                          Save as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadChart(stockChartRef, 'stock-distribution.png', 'clipboard')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to Clipboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintChart(stockChartRef, 'Stock Distribution')}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEnlargedChart('stock')}>
                          <Maximize2 className="mr-2 h-4 w-4" />
                          View Larger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setEnlargedChart('stock')}
                    className="text-xs"
                  >
                    View Larger Chart
                  </Button>
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
                        <td className="py-3 px-4 font-bold">Total Bank Balances</td>
                        <td className="py-3 px-4 text-right font-bold">
                          {formatCurrency(dashboardData.totalBankBalances)}
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
                <CardTitle className="flex items-center justify-between">
                  <span>Cash Distribution</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEnlargedChart('cash')}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 lg:h-72 w-full relative" ref={cashTabChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <Pie
                        data={cashPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        labelLine={false}
                        label={({ name, percent }) => 
                          percent > 0.05 ? `${name.slice(0, 8)}${name.length > 8 ? '...' : ''}` : ''
                        }
                      >
                        {cashPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                            stroke="white"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name: string) => [
                          formatCurrency(Number(value)), 
                          name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{
                          fontSize: '12px',
                          paddingTop: '10px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Chart Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadChart(cashTabChartRef, 'cash-tab-distribution.png')}>
                          <Image className="mr-2 h-4 w-4" />
                          Save as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadChart(cashTabChartRef, 'cash-tab-distribution.png', 'clipboard')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to Clipboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintChart(cashTabChartRef, 'Cash Distribution')}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEnlargedChart('cash')}>
                          <Maximize2 className="mr-2 h-4 w-4" />
                          View Larger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Add the enlarged chart modal */}
      {enlargedChart && (
        <Dialog open={!!enlargedChart} onOpenChange={() => setEnlargedChart(null)}>
          <DialogContent className="max-w-5xl p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>{enlargedChart === 'cash' ? 'Cash Distribution' : 'Stock Distribution'}</DialogTitle>
            </DialogHeader>
            <div className="h-[500px] w-full px-4 pb-6 relative" ref={enlargedChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                  <Pie
                    data={enlargedChart === 'cash' ? cashPieData : stockPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={180}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {(enlargedChart === 'cash' ? cashPieData : stockPieData).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors[index % colors.length]} 
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name: string) => 
                      enlargedChart === 'cash' 
                        ? [formatCurrency(Number(value)), name]
                        : [formatQuantity(Number(value)), name]
                    }
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{
                      fontSize: '13px',
                      paddingTop: '20px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Chart Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDownloadChart(
                        enlargedChartRef, 
                        enlargedChart === 'cash' ? 'cash-distribution-large.png' : 'stock-distribution-large.png'
                      )}
                    >
                      <Image className="mr-2 h-4 w-4" />
                      Save as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDownloadChart(
                        enlargedChartRef, 
                        enlargedChart === 'cash' ? 'cash-distribution-large.png' : 'stock-distribution-large.png',
                        'clipboard'
                      )}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handlePrintChart(
                        enlargedChartRef, 
                        enlargedChart === 'cash' ? 'Cash Distribution (Detailed)' : 'Stock Distribution (Detailed)'
                      )}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print Chart
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Update Modal */}
      <Dialog open={stockUpdateOpen} onOpenChange={setStockUpdateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Stock Balance</DialogTitle>
            <DialogDescription>
              Set the new stock balance for {selectedPlatform || 'the selected platform'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!selectedPlatform && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="platform" className="text-right">
                  Platform
                </Label>
                <div className="col-span-3">
                  <PlatformSelector
                    value={selectedPlatform}
                    onChange={(value) => setSelectedPlatform(value)}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newBalance" className="text-right">
                New Balance
              </Label>
              <Input
                id="newBalance"
                value={newStockBalance}
                onChange={(e) => setNewStockBalance(e.target.value)}
                className="col-span-3"
                type="number"
                step="0.00000001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleStockUpdate}>Update Balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Update Modal */}
      <Dialog open={cashUpdateOpen} onOpenChange={setCashUpdateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Cash Balance</DialogTitle>
            <DialogDescription>
              Set the new cash balance for {selectedBank || 'the selected bank'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!selectedBank && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bank" className="text-right">
                  Bank
                </Label>
                <div className="col-span-3">
                  <CustomSelect value={selectedBank} onValueChange={(value) => setSelectedBank(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.name} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </CustomSelect>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newBalance" className="text-right">
                New Balance
              </Label>
              <Input
                id="newBalance"
                value={newCashBalance}
                onChange={(e) => setNewCashBalance(e.target.value)}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCashUpdate}>Update Balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POS Banks Selection Modal */}
      <Dialog open={posBankSelectOpen} onOpenChange={setPosBankSelectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Banks for POS Calculation</DialogTitle>
            <DialogDescription>
              Choose which banks should be included in the POS cash calculation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {banks.map((bank) => (
                <div key={bank.name} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`bank-${bank.name}`} 
                    checked={posSettings?.posActiveBanks?.includes(bank.name)}
                    onCheckedChange={(checked: boolean) => {
                      const currentBanks = posSettings?.posActiveBanks || [];
                      let newBanks;
                      
                      if (checked) {
                        newBanks = [...currentBanks, bank.name];
                      } else {
                        newBanks = currentBanks.filter(b => b !== bank.name);
                      }
                      
                      updatePosSettings({
                        ...posSettings,
                        posActiveBanks: newBanks
                      });
                    }}
                  />
                  <Label htmlFor={`bank-${bank.name}`} className="text-sm cursor-pointer">
                    {bank.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              handleRefresh();
              setPosBankSelectOpen(false);
            }}>
              Save & Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Dashboard;