import React, { useMemo, useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { statsDataAtom, salesAtom, purchasesAtom, dataVersionAtom } from '../store/data';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatCurrency, formatQuantity, calculateDailyProfitMargin } from '../lib/utils';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Widget that shows today's profit metrics:
 * - Total sales quantity for today
 * - Today's NPM (Net Profit Margin) value
 * - Calculated profit (sales quantity × NPM)
 */
const TodayProfitWidget: React.FC = () => {
  const [statsData] = useAtom(statsDataAtom);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [dataVersion] = useAtom(dataVersionAtom);
  
  // State to track if there's a fresh update
  const [hasFreshUpdate, setHasFreshUpdate] = useState(false);
  const [prevValues, setPrevValues] = useState({ salesQty: 0, npm: 0, profit: 0 });
  
  // Calculate today's data
  const todayData = useMemo(() => {
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
    
    // Calculate today's total sales quantity
    const todaySalesQty = todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    
    // Calculate today's NPM
    const todayNPM = calculateDailyProfitMargin(todaySales, todayPurchases);
    
    // Calculate today's profit (sales quantity × NPM)
    const todayProfit = todaySalesQty * todayNPM;
    
    console.log('Today profit widget - Fresh calculation:', {
      salesQty: todaySalesQty,
      npm: todayNPM,
      profit: todayProfit
    });
    
    return {
      salesQty: todaySalesQty,
      npm: todayNPM,
      profit: todayProfit
    };
  }, [sales, purchases, dataVersion]); // Add dataVersion to dependencies for live updates
  
  // Check for changes when data updates
  useEffect(() => {
    // Skip initial render
    if (dataVersion === 0) return;
    
    // Check if any values have changed
    const hasChanged = 
      todayData.salesQty !== prevValues.salesQty || 
      todayData.npm !== prevValues.npm ||
      todayData.profit !== prevValues.profit;
    
    // If values changed, show the update indication
    if (hasChanged) {
      setHasFreshUpdate(true);
      
      // Store new values
      setPrevValues({
        salesQty: todayData.salesQty,
        npm: todayData.npm,
        profit: todayData.profit
      });
      
      // Clear the indication after 5 seconds
      const timer = setTimeout(() => {
        setHasFreshUpdate(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [todayData, prevValues, dataVersion]);
  
  // Breathing animation for the indicator
  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  // Value change animation
  const numberVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      y: 10,
      transition: { duration: 0.2 }
    }
  };
  
  return (
    <Card className="relative overflow-hidden">
      {/* Live indicator */}
      {hasFreshUpdate && (
        <motion.div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500"
          variants={pulseVariants}
          animate="pulse"
        />
      )}
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <motion.span 
            className={`${hasFreshUpdate ? 'text-green-500' : 'text-emerald-500'} mr-2 inline-block w-2 h-2 rounded-full`}
            animate={{
              scale: hasFreshUpdate ? [1, 1.5, 1] : 1,
              opacity: hasFreshUpdate ? [0.7, 1, 0.7] : 1
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span>Today's Profit</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">(Live)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Sales Qty</div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={`sales-${todayData.salesQty}`}
                className="text-lg font-bold text-blue-600"
                variants={numberVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {formatQuantity(todayData.salesQty)}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">NPM</div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={`npm-${todayData.npm}`}
                className="text-lg font-bold text-purple-600"
                variants={numberVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {formatCurrency(todayData.npm)}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-500">Profit</div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={`profit-${todayData.profit}`}
                className="text-lg font-bold text-emerald-600"
                variants={numberVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {formatCurrency(todayData.profit)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-right">
          Profit = Sales Qty × NPM
        </div>
        {hasFreshUpdate && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-green-500 font-medium mt-1 text-right"
          >
            Updated just now
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayProfitWidget; 