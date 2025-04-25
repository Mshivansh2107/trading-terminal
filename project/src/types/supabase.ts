export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sales: {
        Row: {
          id: string
          order_number: string
          bank: string
          order_type: string
          asset_type: string
          fiat_type: string
          total_price: number
          price: number
          quantity: number
          platform: string
          name: string
          contact_no: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_number: string
          bank: string
          order_type: string
          asset_type: string
          fiat_type: string
          total_price: number
          price: number
          quantity: number
          platform: string
          name: string
          contact_no?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          bank?: string
          order_type?: string
          asset_type?: string
          fiat_type?: string
          total_price?: number
          price?: number
          quantity?: number
          platform?: string
          name?: string
          contact_no?: string | null
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          order_number: string
          bank: string
          order_type: string
          asset_type: string
          fiat_type: string
          total_price: number
          price: number
          quantity: number
          platform: string
          name: string
          contact_no: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_number: string
          bank: string
          order_type: string
          asset_type: string
          fiat_type: string
          total_price: number
          price: number
          quantity: number
          platform: string
          name: string
          contact_no?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          bank?: string
          order_type?: string
          asset_type?: string
          fiat_type?: string
          total_price?: number
          price?: number
          quantity?: number
          platform?: string
          name?: string
          contact_no?: string | null
          created_at?: string
        }
      }
      transfers: {
        Row: {
          id: string
          from_platform: string
          to_platform: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          from_platform: string
          to_platform: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          from_platform?: string
          to_platform?: string
          quantity?: number
          created_at?: string
        }
      }
    }
  }
}