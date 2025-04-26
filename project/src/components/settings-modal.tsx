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
  const [requiredMargin, setRequiredMargin] = React.useState(settings.requiredMargin.toString());

  const handleSave = () => {
    setSettings({
      ...settings,
      requiredMargin: parseFloat(requiredMargin) || 3,
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
        </div>
        
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal; 