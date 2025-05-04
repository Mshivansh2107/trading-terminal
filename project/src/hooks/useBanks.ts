import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BankEntity } from '../types';

export const useBanks = () => {
  const [banks, setBanks] = useState<BankEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('banks')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          // Convert database format to application format
          const formattedBanks: BankEntity[] = data.map(bank => ({
            id: bank.id,
            name: bank.name,
            description: bank.description,
            isActive: bank.is_active,
            createdAt: new Date(bank.created_at),
            updatedAt: new Date(bank.updated_at || bank.created_at)
          }));
          setBanks(formattedBanks);
        }
      } catch (err) {
        console.error('Error fetching banks:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch banks'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanks();
  }, []);

  return { banks, isLoading, error };
};

// Helper function to convert bank to select option format
export const bankToSelectOption = (bank: BankEntity) => ({
  value: bank.name,
  label: bank.name,
}); 