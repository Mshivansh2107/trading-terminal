import axios from 'axios';
import { supabase } from './supabase';

const PRIMARY_API_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
const FALLBACK_API_BASE = 'https://latest.currency-api.pages.dev/v1';
const CACHE_DURATION = 60000; // 1 minute in milliseconds

interface CacheData {
  price: number;
  timestamp: number;
}

let priceCache: CacheData | null = null;

// Function to fetch USD to INR price with fallback
async function fetchFromUrl(url: string): Promise<number | null> {
  try {
    const response = await axios.get(url);
    if (response.data?.usd?.inr) {
      return response.data.usd.inr;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}

// Function to fetch current USD/INR price
export async function fetchUsdtInrPrice(): Promise<number> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.price;
  }

  try {
    // Try primary URL first
    let price = await fetchFromUrl(`${PRIMARY_API_BASE}/currencies/usd.json`);
    
    // If primary fails, try fallback URL
    if (!price) {
      price = await fetchFromUrl(`${FALLBACK_API_BASE}/currencies/usd.json`);
    }

    if (price) {
      // Update cache
      priceCache = {
        price,
        timestamp: Date.now()
      };
      return price;
    }

    throw new Error('Failed to fetch price from all sources');
  } catch (error) {
    console.error('Error fetching USD/INR price:', error);
    // Return the last known price from settings if available
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'trading_settings')
        .single();
      
      return settings?.value?.currentUsdPrice || priceCache?.price || 0;
    } catch (e) {
      console.error('Error fetching fallback price:', e);
      return priceCache?.price || 0; // Return cached price if available
    }
  }
}

// Function to fetch price with retry mechanism and update global settings
export async function getUsdtPrice(retries = 3): Promise<number> {
  for (let i = 0; i < retries; i++) {
    try {
      const price = await fetchUsdtInrPrice();
      if (price > 0) {
        // Update the global settings in Supabase
        const { data: settings, error: fetchError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'trading_settings')
          .single();

        if (!fetchError && settings) {
          const updatedSettings = {
            ...settings.value,
            currentUsdPrice: price,
            lastUsdtPriceUpdate: Date.now()
          };

          const { error: updateError } = await supabase
            .from('settings')
            .update({ 
              value: updatedSettings,
              updated_at: new Date().toISOString()
            })
            .eq('key', 'trading_settings');

          if (updateError) {
            console.error('Error updating settings:', updateError);
          }
        }

        return price;
      }
    } catch (error) {
      if (i === retries - 1) {
        console.error('Failed to fetch USDT price after multiple attempts');
        return 0;
      }
      // Wait for a second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return 0;
}

// Function to update buy price USDT in global settings
export async function updateBuyPriceUsdt(buyPrice: number): Promise<boolean> {
  try {
    const { data: settings, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'trading_settings')
      .single();

    if (fetchError) {
      console.error('Error fetching settings:', fetchError);
      return false;
    }

    if (settings) {
      const updatedSettings = {
        ...settings.value,
        buyPriceUsdt: buyPrice
      };

      const { error: updateError } = await supabase
        .from('settings')
        .update({ 
          value: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'trading_settings');

      if (updateError) {
        console.error('Error updating settings:', updateError);
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating buy price:', error);
    return false;
  }
}

// Function to get current settings
export async function getSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'trading_settings')
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data?.value || null;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
} 