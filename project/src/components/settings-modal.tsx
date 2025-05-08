import React, { useEffect, useTransition } from 'react';
import { useAtom } from 'jotai';
import { Link } from 'react-router-dom';
import { 
  settingsAtom, 
  syncSettingsAtom, 
  updateSettingsAtom,
  autoFetchUsdPriceAtom 
} from '../store/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RefreshCw, Building2, LayoutGrid, AlertTriangle } from 'lucide-react';
import ResetConfirmationDialog from './reset-confirmation-dialog';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const [settings] = useAtom(settingsAtom);
  const [, syncSettings] = useAtom(syncSettingsAtom);
  const [, updateSettings] = useAtom(updateSettingsAtom);
  const [, autoFetchPrice] = useAtom(autoFetchUsdPriceAtom);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  
  const [requiredMargin, setRequiredMargin] = React.useState('3');
  const [currentUsdPrice, setCurrentUsdPrice] = React.useState('0');
  const [salesPriceRange, setSalesPriceRange] = React.useState('0');
  const [buyPriceUsdt, setBuyPriceUsdt] = React.useState('0');

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setRequiredMargin(String(settings.requiredMargin ?? 3));
      setCurrentUsdPrice(String(settings.currentUsdPrice ?? 0));
      setSalesPriceRange(String(settings.salesPriceRange ?? 0));
      setBuyPriceUsdt(String(settings.buyPriceUsdt ?? 0));
    }
  }, [settings]);

  // Load settings when modal opens and start auto-fetch
  useEffect(() => {
    if (open) {
      startTransition(() => {
        syncSettings();
      });
      
      // Set up auto-fetch interval
      const interval = setInterval(() => {
        startTransition(() => {
          autoFetchPrice();
        });
      }, 3930000); // ~65.5 minutes - allows for ~22 calls per day
      
      return () => clearInterval(interval);
    }
  }, [open, syncSettings, autoFetchPrice]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      startTransition(() => {
        updateSettings({
          requiredMargin: parseFloat(requiredMargin) || 3,
          salesPriceRange: parseFloat(salesPriceRange) || 0,
          buyPriceUsdt: parseFloat(buyPriceUsdt) || 0,
        });
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPrice = () => {
    setIsLoading(true);
    try {
      console.log("Manually refreshing USD-INR rate from FX Rates API...");
      startTransition(() => {
        autoFetchPrice().then(() => {
          alert("USD-INR rate updated successfully!");
        }).catch(error => {
          alert("Failed to update USD-INR rate. Check console for details.");
          console.error(error);
        });
      });
    } catch (error) {
      console.error('Error refreshing USD price:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Adjust your application settings here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="requiredMargin" className="text-right">
              Required Margin (%)
            </Label>
            <Input
              id="requiredMargin"
              type="number"
              step="0.1"
              value={requiredMargin}
              onChange={(e) => setRequiredMargin(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentUsdPrice" className="text-right">
              Current USDT Price
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="currentUsdPrice"
                type="number"
                step="0.01"
                value={currentUsdPrice}
                onChange={(e) => setCurrentUsdPrice(e.target.value)}
                className="flex-1"
                disabled
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleRefreshPrice}
                disabled={isLoading || isPending}
                title="Refresh USD-INR rate from FX Rates API"
              >
                <RefreshCw className={`h-4 w-4 ${(isLoading || isPending) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-xs text-gray-500 col-span-4 text-right">
              Using FX Rates API - Updates automatically every hour
            </p>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="buyPriceUsdt" className="text-right">
              Buy Price USDT
            </Label>
            <Input
              id="buyPriceUsdt"
              type="number"
              step="0.01"
              value={buyPriceUsdt}
              onChange={(e) => setBuyPriceUsdt(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="salesPriceRange" className="text-right">
              Sales Price Range
            </Label>
            <Input
              id="salesPriceRange"
              type="number"
              step="0.01"
              value={salesPriceRange}
              onChange={(e) => setSalesPriceRange(e.target.value)}
              className="col-span-3"
            />
            <p className="text-xs text-gray-500 col-span-4 text-right">
              Set to 0 to use automatic calculation
            </p>
          </div>
        </div>
        
        {/* Add management links */}
        <div className="grid gap-4 py-2 border-t pt-4">
          <h4 className="text-sm font-medium mb-1">Management Options</h4>
          <div className="grid grid-cols-2 gap-4">
            <Button asChild variant="outline" className="w-full">
              <Link to="/banks" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Bank Management</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/platforms" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span>Platform Management</span>
              </Link>
            </Button>
          </div>
        </div>

          {/* Add reset section */}
          <div className="grid gap-4 py-2 border-t pt-4">
            <h4 className="text-sm font-medium mb-1">Danger Zone</h4>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowResetDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSave}
            disabled={isLoading || isPending}
          >
            {(isLoading || isPending) ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <ResetConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
      />
    </>
  );
};

export default SettingsModal; 