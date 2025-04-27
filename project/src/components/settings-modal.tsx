import React from 'react';
import { useAtom } from 'jotai';
import { settingsAtom } from '../store/data';
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

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const [settings, setSettings] = useAtom(settingsAtom);
  const [requiredMargin, setRequiredMargin] = React.useState(
    settings?.requiredMargin?.toString() || '3'
  );
  const [currentUsdPrice, setCurrentUsdPrice] = React.useState(
    settings?.currentUsdPrice?.toString() || '0'
  );
  const [salesPriceRange, setSalesPriceRange] = React.useState(
    settings?.salesPriceRange?.toString() || '0'
  );

  const handleSave = () => {
    setSettings({
      ...(settings || {}),
      requiredMargin: parseFloat(requiredMargin) || 3,
      currentUsdPrice: parseFloat(currentUsdPrice) || 0,
      salesPriceRange: parseFloat(salesPriceRange) || 0,
    });
    onOpenChange(false);
  };

  return (
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
              Current USD Price
            </Label>
            <Input
              id="currentUsdPrice"
              type="number"
              step="0.01"
              value={currentUsdPrice}
              onChange={(e) => setCurrentUsdPrice(e.target.value)}
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
        
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal; 