export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      hotmart_sales: {
        Row: {
          affiliate_code: string | null
          affiliate_name: string | null
          buyer_address: string | null
          buyer_address_complement: string | null
          buyer_address_number: string | null
          buyer_cep: string | null
          buyer_city: string | null
          buyer_country: string | null
          buyer_document: string | null
          buyer_email: string | null
          buyer_instagram: string | null
          buyer_name: string | null
          buyer_neighborhood: string | null
          buyer_phone: string | null
          buyer_phone_ddd: string | null
          buyer_state: string | null
          checkout_origin: string | null
          confirmation_date: string | null
          coupon: string | null
          created_at: string
          due_date: string | null
          exchange_rate: number | null
          free_period: string | null
          has_coproduction: boolean | null
          id: string
          installment_number: number | null
          invoice_number: string | null
          is_upgrade: boolean | null
          items_quantity: number | null
          net_revenue: number | null
          offer_code: string | null
          offer_currency: string | null
          offer_price: number | null
          origin: string | null
          original_price: number | null
          payment_method: string | null
          payment_type: string | null
          producer_document: string | null
          producer_name: string | null
          product_code: string | null
          product_currency: string | null
          product_name: string
          product_price: number | null
          received_value: number | null
          recurrence: number | null
          sale_date: string | null
          sale_origin: string | null
          shipping_value: number | null
          sold_as: string | null
          status: string
          subscriber_code: string | null
          total_price: number | null
          transaction_id: string
          updated_at: string
          utm_adset_name: string | null
          utm_campaign_id: string | null
          utm_creative: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_name?: string | null
          buyer_address?: string | null
          buyer_address_complement?: string | null
          buyer_address_number?: string | null
          buyer_cep?: string | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_document?: string | null
          buyer_email?: string | null
          buyer_instagram?: string | null
          buyer_name?: string | null
          buyer_neighborhood?: string | null
          buyer_phone?: string | null
          buyer_phone_ddd?: string | null
          buyer_state?: string | null
          checkout_origin?: string | null
          confirmation_date?: string | null
          coupon?: string | null
          created_at?: string
          due_date?: string | null
          exchange_rate?: number | null
          free_period?: string | null
          has_coproduction?: boolean | null
          id?: string
          installment_number?: number | null
          invoice_number?: string | null
          is_upgrade?: boolean | null
          items_quantity?: number | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_currency?: string | null
          offer_price?: number | null
          origin?: string | null
          original_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          producer_document?: string | null
          producer_name?: string | null
          product_code?: string | null
          product_currency?: string | null
          product_name: string
          product_price?: number | null
          received_value?: number | null
          recurrence?: number | null
          sale_date?: string | null
          sale_origin?: string | null
          shipping_value?: number | null
          sold_as?: string | null
          status: string
          subscriber_code?: string | null
          total_price?: number | null
          transaction_id: string
          updated_at?: string
          utm_adset_name?: string | null
          utm_campaign_id?: string | null
          utm_creative?: string | null
          utm_placement?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_name?: string | null
          buyer_address?: string | null
          buyer_address_complement?: string | null
          buyer_address_number?: string | null
          buyer_cep?: string | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_document?: string | null
          buyer_email?: string | null
          buyer_instagram?: string | null
          buyer_name?: string | null
          buyer_neighborhood?: string | null
          buyer_phone?: string | null
          buyer_phone_ddd?: string | null
          buyer_state?: string | null
          checkout_origin?: string | null
          confirmation_date?: string | null
          coupon?: string | null
          created_at?: string
          due_date?: string | null
          exchange_rate?: number | null
          free_period?: string | null
          has_coproduction?: boolean | null
          id?: string
          installment_number?: number | null
          invoice_number?: string | null
          is_upgrade?: boolean | null
          items_quantity?: number | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_currency?: string | null
          offer_price?: number | null
          origin?: string | null
          original_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          producer_document?: string | null
          producer_name?: string | null
          product_code?: string | null
          product_currency?: string | null
          product_name?: string
          product_price?: number | null
          received_value?: number | null
          recurrence?: number | null
          sale_date?: string | null
          sale_origin?: string | null
          shipping_value?: number | null
          sold_as?: string | null
          status?: string
          subscriber_code?: string | null
          total_price?: number | null
          transaction_id?: string
          updated_at?: string
          utm_adset_name?: string | null
          utm_campaign_id?: string | null
          utm_creative?: string | null
          utm_placement?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      offer_mappings: {
        Row: {
          anotacoes: string | null
          codigo_oferta: string | null
          created_at: string
          data_ativacao: string | null
          data_desativacao: string | null
          id: string
          id_funil: string
          id_produto: string | null
          id_produto_visual: string | null
          nome_oferta: string | null
          nome_posicao: string | null
          nome_produto: string
          ordem_posicao: number | null
          status: string | null
          tipo_posicao: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          anotacoes?: string | null
          codigo_oferta?: string | null
          created_at?: string
          data_ativacao?: string | null
          data_desativacao?: string | null
          id?: string
          id_funil: string
          id_produto?: string | null
          id_produto_visual?: string | null
          nome_oferta?: string | null
          nome_posicao?: string | null
          nome_produto: string
          ordem_posicao?: number | null
          status?: string | null
          tipo_posicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          anotacoes?: string | null
          codigo_oferta?: string | null
          created_at?: string
          data_ativacao?: string | null
          data_desativacao?: string | null
          id?: string
          id_funil?: string
          id_produto?: string | null
          id_produto_visual?: string | null
          nome_oferta?: string | null
          nome_posicao?: string | null
          nome_produto?: string
          ordem_posicao?: number | null
          status?: string | null
          tipo_posicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
