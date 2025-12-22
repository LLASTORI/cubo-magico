
-- Update crm_contacts phone from hotmart_sales where phone is missing
UPDATE crm_contacts c
SET 
  phone = sub.buyer_phone,
  phone_ddd = sub.buyer_phone_ddd,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (h.buyer_email, h.project_id)
    h.buyer_email,
    h.project_id,
    h.buyer_phone,
    h.buyer_phone_ddd
  FROM hotmart_sales h
  WHERE h.buyer_phone IS NOT NULL 
    AND h.buyer_phone != ''
  ORDER BY h.buyer_email, h.project_id, h.confirmation_date DESC NULLS LAST, h.sale_date DESC NULLS LAST
) sub
WHERE c.email = sub.buyer_email
  AND c.project_id = sub.project_id
  AND (c.phone IS NULL OR c.phone = '');
