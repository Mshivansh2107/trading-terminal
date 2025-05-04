import axios from 'axios';
import { supabase } from './supabase';

// FX Rates API configuration
const FX_RATES_API_URL = 'https://api.fxratesapi.com/latest';
const FX_RATES_API_TOKEN = 'fxr_live_1fca18211461a24b164109be95c887124518';

const CACHE_DURATION = import.meta.env.VITE_CACHE_DURATION; // ~65.5 minutes - allows for ~22 calls per day

// Fallback API in case FX Rates fails
const FALLBACK_API_BASE = 'https://latest.currency-api.pages.dev/v1';

interface CacheData {
  price: number;
  timestamp: number;
}

let priceCache: CacheData | null = null;

// Function to fetch USD to INR price from FX Rates API
async function fetchFromFxRatesApi(): Promise<number | null> {
  try {
    const response = await axios.get(FX_RATES_API_URL, {
      params: {
        base: 'USD',
        currencies: 'INR',
        resolution: 'hour', // Get hourly rates
        format: 'json'
      },
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${FX_RATES_API_TOKEN}`
      }
    });

    // Check if response contains valid data
    if (response.data && response.data.rates && response.data.rates.INR) {
      return response.data.rates.INR;
    }
    
    console.error('Invalid response from FX Rates API:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching from FX Rates API:', error);
    return null;
  }
}

// Fallback function to fetch from alternative API if FX Rates fails
async function fetchFromFallbackApi(): Promise<number | null> {
  try {
    const response = await axios.get(`${FALLBACK_API_BASE}/currencies/usd.json`);
    if (response.data?.usd?.inr) {
      return response.data.usd.inr;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching from fallback API:`, error);
    return null;
  }
}

// Function to fetch current USD/INR price
export async function fetchUsdtInrPrice(): Promise<number> {
  // Check cache first - only use if less than 1 hour old
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.price;
  }

  try {
    // Try FX Rates API first
    let price = await fetchFromFxRatesApi();
    
    // If FX Rates API fails, try fallback
    if (!price) {
      console.warn('FX Rates API failed, trying fallback');
      price = await fetchFromFallbackApi();
    }

    if (price) {
      // Update cache
      priceCache = {
        price,
        timestamp: Date.now()
      };
      
      console.log(`Updated USD-INR rate: ${price} at ${new Date().toLocaleString()}`);
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