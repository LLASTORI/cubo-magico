# Auditoria de Functions da migração (banco novo)

Validação por inspeção dos SQLs versionados no repositório (migrations + dumps locais).

- Total esperado: 42 functions
- Encontradas: 42
- Faltantes: 0

## Faltantes

Nenhuma function faltante nesta lista.

## Localização (primeira ocorrência encontrada)

| Function | Arquivo | Linha |
|---|---|---:|
| `update_updated_at_column` | `supabase/migrations/20251126135324_f61d4f69-01f3-47b4-a231-124b9def3dff.sql` | 112 |
| `has_role` | `supabase/migrations/20251203013822_404f6bee-36e2-47df-a9b6-150cceaf6f8b.sql` | 60 |
| `is_super_admin` | `supabase/migrations/20251210165343_9e0e7b76-ec2d-4e7d-80b5-f5d4a60bcd37.sql` | 2 |
| `has_project_access` | `supabase/migrations/20251203123807_0415fccd-cc9a-4ffd-8494-1cd472f124fc.sql` | 48 |
| `get_user_project_role` | `supabase/migrations/20251203123807_0415fccd-cc9a-4ffd-8494-1cd472f124fc.sql` | 36 |
| `count_project_members` | `supabase/migrations/20251203123807_0415fccd-cc9a-4ffd-8494-1cd472f124fc.sql` | 62 |
| `can_user_create_project` | `supabase/migrations/20251203134536_3bdc3610-7722-4d36-ae73-6fd9e42ce756.sql` | 8 |
| `can_invite_to_project` | `supabase/migrations/20251203123807_0415fccd-cc9a-4ffd-8494-1cd472f124fc.sql` | 74 |
| `count_user_projects` | `supabase/migrations/20251203134536_3bdc3610-7722-4d36-ae73-6fd9e42ce756.sql` | 26 |
| `has_active_subscription` | `supabase/migrations/20251210174333_de28f59c-e1c8-420e-936b-196d6508ded8.sql` | 79 |
| `get_user_max_projects` | `supabase/migrations/20251210174333_de28f59c-e1c8-420e-936b-196d6508ded8.sql` | 97 |
| `has_area_permission` | `supabase/migrations/20251217170855_41222af5-cd3e-48ab-ad05-682d4446018f.sql` | 58 |
| `extract_name_parts` | `supabase/migrations/20251226012142_4fd12738-34c5-4eaf-a4cf-5f2574e88721.sql` | 22 |
| `handle_new_user` | `supabase/migrations/20251203013822_404f6bee-36e2-47df-a9b6-150cceaf6f8b.sql` | 76 |
| `handle_new_project` | `supabase/migrations/20251208195657_dc083776-970d-4c7a-9292-6d41eb36eeef.sql` | 2 |
| `generate_project_public_code` | `supabase/migrations/20260103151201_8880d85a-3b13-477d-ae3b-286b36cad540.sql` | 13 |
| `normalize_phone_number` | `supabase/migrations/20251218141937_11969387-3b7a-47df-b7b1-2074ecf973e5.sql` | 5 |
| `create_member_permissions` | `supabase/migrations/20251217170855_41222af5-cd3e-48ab-ad05-682d4446018f.sql` | 110 |
| `create_default_pipeline_stages` | `supabase/migrations/20251213003425_554d152c-ba4e-444a-b3fb-cdfd8f153b1d.sql` | 98 |
| `create_default_recovery_stages` | `supabase/migrations/20251214154652_022603e4-43f7-4ea8-b47f-2d955d93afb8.sql` | 65 |
| `get_encryption_key` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 34 |
| `encrypt_sensitive` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 52 |
| `decrypt_sensitive` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 79 |
| `encrypt_project_credentials` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 215 |
| `encrypt_contact_document` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 248 |
| `get_project_credentials_secure` | `supabase/migrations/20251217195311_52ffc44a-ba35-4d03-a588-f717a5dae574.sql` | 7 |
| `get_contact_document` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 165 |
| `normalize_whatsapp_number_trigger` | `supabase/migrations/20251218141937_11969387-3b7a-47df-b7b1-2074ecf973e5.sql` | 32 |
| `sync_hotmart_sale_to_crm` | `supabase/migrations/20251212210224_51c4756b-933a-4c34-8b55-760ac62f7d9b.sql` | 273 |
| `detect_auto_recovery` | `supabase/migrations/20251215122457_f1759f4f-4292-4e6a-acb9-e253e7167fa9.sql` | 4 |
| `sync_project_max_members_from_plan` | `supabase/migrations/20260104144020_550ddfe5-ccc3-49df-bb1b-9b185265f738.sql` | 24 |
| `update_orders_updated_at` | `supabase/migrations/20260115231918_e897bb08-5d5f-4137-9858-53be2dd3765a.sql` | 316 |
| `update_sales_history_updated_at` | `supabase/migrations/20260126131918_1ebdbb9b-bbeb-4de1-b092-4cecb9415a5c.sql` | 176 |
| `update_product_revenue_splits_updated_at` | `supabase/migrations/20260112170228_0fe92499-201f-427e-846f-dde7f01a885d.sql` | 231 |
| `update_last_login` | `supabase/migrations/20251215181000_e1d3d140-f9b1-47b5-a13e-4be03ffe643d.sql` | 41 |
| `has_accepted_terms` | `supabase/migrations/20251215134338_64eeee96-57a4-4df8-93ed-232ee23dc7b8.sql` | 38 |
| `increment_lovable_credits` | `supabase/migrations/20260106003149_bf18fe57-8426-430f-bc5a-b65a49e77ad4.sql` | 2 |
| `aggregate_comment_metrics_daily` | `supabase/migrations/20251230214207_9fd2d92c-5c4c-4eb7-a894-0dad8dff6b44.sql` | 308 |
| `get_next_available_agent` | `supabase/migrations/20251216180349_3482943f-7eae-4729-bb29-52686da04563.sql` | 36 |
| `get_queue_position` | `supabase/migrations/20251216180349_3482943f-7eae-4729-bb29-52686da04563.sql` | 73 |
| `cleanup_old_webhook_metrics` | `supabase/migrations/20251216180349_3482943f-7eae-4729-bb29-52686da04563.sql` | 88 |
| `log_user_activity` | `supabase/migrations/20251215192029_29b8eee2-b9ef-4267-b47b-a0b1e187d5d1.sql` | 2 |
