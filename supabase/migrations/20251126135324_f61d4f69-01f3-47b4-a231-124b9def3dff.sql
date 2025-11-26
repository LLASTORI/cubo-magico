-- Create table for Hotmart sales with all relevant fields
CREATE TABLE IF NOT EXISTS public.hotmart_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Product information
  product_name TEXT NOT NULL,
  product_code TEXT,
  producer_name TEXT,
  producer_document TEXT,
  
  -- Affiliate information
  affiliate_name TEXT,
  affiliate_code TEXT,
  
  -- Transaction details
  transaction_id TEXT UNIQUE NOT NULL,
  payment_method TEXT,
  payment_type TEXT,
  origin TEXT,
  
  -- Pricing
  product_currency TEXT,
  product_price DECIMAL(10, 2),
  offer_currency TEXT,
  offer_price DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  exchange_rate DECIMAL(10, 4),
  received_value DECIMAL(10, 2),
  net_revenue DECIMAL(10, 2),
  
  -- Payment details
  installment_number INTEGER,
  recurrence INTEGER,
  free_period TEXT,
  offer_code TEXT,
  coupon TEXT,
  
  -- Dates
  sale_date TIMESTAMP WITH TIME ZONE,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL,
  
  -- Buyer information (PII - will need RLS)
  buyer_name TEXT,
  buyer_document TEXT,
  buyer_email TEXT,
  buyer_phone_ddd TEXT,
  buyer_phone TEXT,
  buyer_instagram TEXT,
  
  -- Address
  buyer_cep TEXT,
  buyer_city TEXT,
  buyer_state TEXT,
  buyer_neighborhood TEXT,
  buyer_country TEXT,
  buyer_address TEXT,
  buyer_address_number TEXT,
  buyer_address_complement TEXT,
  
  -- UTM and tracking - CRITICAL FOR ROAS
  checkout_origin TEXT, -- Full UTM string
  utm_source TEXT,
  utm_campaign_id TEXT,
  utm_adset_name TEXT,
  utm_placement TEXT,
  utm_creative TEXT,
  sale_origin TEXT,
  
  -- Additional fields
  has_coproduction BOOLEAN DEFAULT FALSE,
  sold_as TEXT,
  items_quantity INTEGER DEFAULT 1,
  is_upgrade BOOLEAN DEFAULT FALSE,
  subscriber_code TEXT,
  invoice_number TEXT,
  shipping_value DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.hotmart_sales ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view all sales (adjust based on your needs)
CREATE POLICY "Users can view all sales"
  ON public.hotmart_sales
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for service role to insert/update sales (for API imports)
CREATE POLICY "Service role can manage sales"
  ON public.hotmart_sales
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes for better query performance
CREATE INDEX idx_hotmart_sales_transaction_id ON public.hotmart_sales(transaction_id);
CREATE INDEX idx_hotmart_sales_sale_date ON public.hotmart_sales(sale_date);
CREATE INDEX idx_hotmart_sales_status ON public.hotmart_sales(status);
CREATE INDEX idx_hotmart_sales_product_code ON public.hotmart_sales(product_code);
CREATE INDEX idx_hotmart_sales_utm_source ON public.hotmart_sales(utm_source);
CREATE INDEX idx_hotmart_sales_utm_campaign_id ON public.hotmart_sales(utm_campaign_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hotmart_sales_updated_at
  BEFORE UPDATE ON public.hotmart_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.hotmart_sales IS 'Stores all sales data from Hotmart including UTM tracking for ROAS analysis';