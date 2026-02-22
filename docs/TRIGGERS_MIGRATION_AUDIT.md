# Auditoria de Triggers da migração (banco novo)

Validação por inspeção dos SQLs versionados no repositório (migrations + dumps locais).

- Triggers obrigatórios esperados: 71
- Triggers obrigatórios encontrados: 71
- Triggers obrigatórios faltantes: 0
- Triggers opcionais esperados: 9
- Triggers opcionais encontrados: 9
- Triggers opcionais faltantes: 0

## Faltantes (obrigatórios)

Nenhum trigger obrigatório faltante nesta lista.

## Faltantes (opcionais/anotados no script)

Nenhum trigger opcional faltante nesta lista.

## Localização (primeira ocorrência encontrada)

| Trigger | Arquivo | Linha |
|---|---|---:|
| `update_admin_notification_settings_updated_at` | `supabase/migrations/20251211130749_c919ecd4-47b7-46ee-bc0c-6575c32a073c.sql` | 35 |
| `update_agent_decisions_log_updated_at` | `supabase/migrations/20260111164755_ddbf47d5-67f6-4e23-b6bf-970ebf01fd9a.sql` | 135 |
| `update_ai_agents_updated_at` | `supabase/migrations/20260111164755_ddbf47d5-67f6-4e23-b6bf-970ebf01fd9a.sql` | 130 |
| `update_ai_knowledge_base_updated_at` | `supabase/migrations/20251231023807_4d872031-7b41-4ed3-9e86-44368d350b0f.sql` | 63 |
| `update_ai_project_quotas_updated_at` | `supabase/migrations/20260105195510_edf49bb8-3d37-4e7c-bb55-d95b60012b02.sql` | 171 |
| `update_automation_executions_updated_at` | `supabase/migrations/20251217153102_4bad3072-12b9-476f-9ea2-d27251c8293f.sql` | 214 |
| `update_automation_flow_nodes_updated_at` | `supabase/migrations/20251217153102_4bad3072-12b9-476f-9ea2-d27251c8293f.sql` | 210 |
| `update_automation_flows_updated_at` | `supabase/migrations/20251217153102_4bad3072-12b9-476f-9ea2-d27251c8293f.sql` | 206 |
| `update_automation_folders_updated_at` | `supabase/migrations/20251217153102_4bad3072-12b9-476f-9ea2-d27251c8293f.sql` | 202 |
| `update_automation_message_templates_updated_at` | `supabase/migrations/20251217153102_4bad3072-12b9-476f-9ea2-d27251c8293f.sql` | 218 |
| `update_comment_metrics_daily_updated_at` | `supabase/migrations/20251230214207_9fd2d92c-5c4c-4eb7-a894-0dad8dff6b44.sql` | 236 |
| `update_contact_memory_updated_at` | `supabase/migrations/20260111165848_7197d628-0026-41fa-a7aa-d983f82d0402.sql` | 69 |
| `update_contact_predictions_updated_at` | `supabase/migrations/20260111163245_e8728b0f-cf17-4a88-b6bb-dd7952f1685e.sql` | 116 |
| `update_crm_activities_tasks_updated_at` | `supabase/migrations/20251213003425_554d152c-ba4e-444a-b3fb-cdfd8f153b1d.sql` | 92 |
| `update_crm_cadence_steps_updated_at` | `supabase/migrations/20251213004317_3da4223d-9096-4a82-bdaf-0bb24ead6507.sql` | 115 |
| `update_crm_cadences_updated_at` | `supabase/migrations/20251213004317_3da4223d-9096-4a82-bdaf-0bb24ead6507.sql` | 111 |
| `update_crm_contact_cadences_updated_at` | `supabase/migrations/20251213004317_3da4223d-9096-4a82-bdaf-0bb24ead6507.sql` | 119 |
| `update_crm_contacts_updated_at` | `supabase/migrations/20251212210224_51c4756b-933a-4c34-8b55-760ac62f7d9b.sql` | 260 |
| `update_crm_pipeline_stages_updated_at` | `supabase/migrations/20251213003425_554d152c-ba4e-444a-b3fb-cdfd8f153b1d.sql` | 87 |
| `update_crm_recovery_stages_updated_at` | `supabase/migrations/20251214154652_022603e4-43f7-4ea8-b47f-2d955d93afb8.sql` | 91 |
| `update_crm_transactions_updated_at` | `supabase/migrations/20251212210224_51c4756b-933a-4c34-8b55-760ac62f7d9b.sql` | 265 |
| `update_economic_days_updated_at` | `supabase/migrations/20260112115002_c7bfccee-51aa-4ad8-be90-da30476f8cbb.sql` | 193 |
| `update_event_dispatch_rules_updated_at` | `supabase/migrations/20260111161853_8ec32611-6409-4a15-91ae-1be04a2f9047.sql` | 116 |
| `update_experience_templates_updated_at` | `supabase/migrations/20260111234836_6fe3c92a-3afe-43b0-99d4-34ad2bb85df0.sql` | 111 |
| `update_experience_themes_updated_at` | `supabase/migrations/20260111234836_6fe3c92a-3afe-43b0-99d4-34ad2bb85df0.sql` | 106 |
| `update_feature_overrides_updated_at` | `supabase/migrations/20251229002459_8dee1971-c6d3-41d6-bc9d-ed6f868769c8.sql` | 131 |
| `update_features_updated_at` | `supabase/migrations/20251229002459_8dee1971-c6d3-41d6-bc9d-ed6f868769c8.sql` | 53 |
| `update_funnel_changes_updated_at` | `supabase/migrations/20251202215001_e1320d18-7ab9-46ba-ab69-10c5c6a01264.sql` | 33 |
| `update_experiments_updated_at` | `supabase/migrations/20260111172009_d52ca940-9987-46bb-8f96-0d01e64b8635.sql` | 187 |
| `update_optimization_suggestions_updated_at` | `supabase/migrations/20260111172009_d52ca940-9987-46bb-8f96-0d01e64b8635.sql` | 182 |
| `update_funnels_updated_at` | `supabase/migrations/20251203031346_4e675e07-5e67-40f2-bb99-2a904fd6b955.sql` | 24 |
| `update_hotmart_product_plans_updated_at` | `supabase/migrations/20251229002459_8dee1971-c6d3-41d6-bc9d-ed6f868769c8.sql` | 173 |
| `update_hotmart_sales_updated_at` | `supabase/migrations/20251126135324_f61d4f69-01f3-47b4-a231-124b9def3dff.sql` | 120 |
| `update_meta_ad_accounts_updated_at` | `supabase/migrations/20251203205845_d0a980e9-5af6-4a4e-b87d-a19dbbaf7d70.sql` | 173 |
| `update_meta_ad_audiences_updated_at` | `supabase/migrations/20251228155210_a52b21c5-4a9d-4c44-b37f-78bf1e42c3c0.sql` | 195 |
| `update_meta_ads_updated_at` | `supabase/migrations/20251203205845_d0a980e9-5af6-4a4e-b87d-a19dbbaf7d70.sql` | 185 |
| `update_meta_adsets_updated_at` | `supabase/migrations/20251203205845_d0a980e9-5af6-4a4e-b87d-a19dbbaf7d70.sql` | 181 |
| `update_meta_campaigns_updated_at` | `supabase/migrations/20251203205845_d0a980e9-5af6-4a4e-b87d-a19dbbaf7d70.sql` | 177 |
| `update_meta_credentials_updated_at` | `supabase/migrations/20251203205845_d0a980e9-5af6-4a4e-b87d-a19dbbaf7d70.sql` | 169 |
| `update_meta_insights_updated_at` | `supabase/migrations/20251203205845_d0a980e9-5af6-4a4e-b87d-a19dbbaf7d70.sql` | 189 |
| `update_offer_mappings_updated_at` | `supabase/migrations/20251130132741_ef905b5e-9506-4c8a-a96c-799c6d20e2de.sql` | 43 |
| `update_orders_updated_at` | `supabase/migrations/20260115231918_e897bb08-5d5f-4137-9858-53be2dd3765a.sql` | 324 |
| `update_personalization_contexts_updated_at` | `supabase/migrations/20260111170732_08329de7-22af-4a3a-96ad-71c2cd56ddb7.sql` | 79 |
| `update_plan_features_updated_at` | `supabase/migrations/20251229002459_8dee1971-c6d3-41d6-bc9d-ed6f868769c8.sql` | 90 |
| `update_plans_updated_at` | `supabase/migrations/20251210174333_de28f59c-e1c8-420e-936b-196d6508ded8.sql` | 66 |
| `update_product_revenue_splits_timestamp` | `supabase/migrations/20260112170228_0fe92499-201f-427e-846f-dde7f01a885d.sql` | 240 |
| `update_profiles_updated_at` | `supabase/migrations/20251203013822_404f6bee-36e2-47df-a9b6-150cceaf6f8b.sql` | 103 |
| `update_project_credentials_updated_at` | `supabase/migrations/20251203013822_404f6bee-36e2-47df-a9b6-150cceaf6f8b.sql` | 111 |
| `update_project_member_feature_permissions_updated_at` | `supabase/migrations/20260107022704_2b76dafd-dd3f-4676-bac2-5c3e6c0cbb4a.sql` | 64 |
| `update_project_member_permissions_updated_at` | `supabase/migrations/20251217170855_41222af5-cd3e-48ab-ad05-682d4446018f.sql` | 148 |
| `update_project_modules_updated_at` | `supabase/migrations/20251212214302_241bb8c0-2f67-4274-8245-fe702c63bc3e.sql` | 40 |
| `update_project_settings_updated_at` | `supabase/migrations/20260112132315_10ac706e-18cb-4eb7-b257-c8fb9b262d50.sql` | 52 |
| `update_project_tracking_settings_updated_at` | `supabase/migrations/20260111161853_8ec32611-6409-4a15-91ae-1be04a2f9047.sql` | 111 |
| `update_projects_updated_at` | `supabase/migrations/20251203013822_404f6bee-36e2-47df-a9b6-150cceaf6f8b.sql` | 107 |
| `update_quiz_outcomes_updated_at` | `supabase/migrations/20260111160505_5f7e9823-acb6-4b44-a067-e92ed1420f64.sql` | 109 |
| `update_quiz_question_conditions_updated_at` | `supabase/migrations/20260111154921_c021889b-23d9-4a67-bae3-7df70eeda355.sql` | 183 |
| `update_quizzes_updated_at` | `supabase/migrations/20260111140815_1f4cf44e-1500-4c8a-9d4b-103979a1eb02.sql` | 397 |
| `update_role_template_feature_permissions_updated_at` | `supabase/migrations/20260107022339_03654771-f98e-4121-8110-03d7778b0ddf.sql` | 78 |
| `update_semantic_profiles_updated_at` | `supabase/migrations/20260112010017_f42d59c6-4ffe-4e9d-9d28-5d58395334b6.sql` | 70 |
| `update_social_comments_updated_at` | `supabase/migrations/20251230214207_9fd2d92c-5c4c-4eb7-a894-0dad8dff6b44.sql` | 231 |
| `update_social_listening_pages_updated_at` | `supabase/migrations/20251230215241_a77af747-96ca-420a-a42c-0e1d07d92d24.sql` | 45 |
| `update_social_posts_updated_at` | `supabase/migrations/20251230214207_9fd2d92c-5c4c-4eb7-a894-0dad8dff6b44.sql` | 226 |
| `encrypt_contact_document_trigger` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 267 |
| `extract_contact_name_parts` | `supabase/migrations/20251226012142_4fd12738-34c5-4eaf-a4cf-5f2574e88721.sql` | 45 |
| `trigger_detect_auto_recovery` | `supabase/migrations/20251215122457_f1759f4f-4292-4e6a-acb9-e253e7167fa9.sql` | 99 |
| `sync_hotmart_to_crm` | `supabase/migrations/20251212210224_51c4756b-933a-4c34-8b55-760ac62f7d9b.sql` | 469 |
| `encrypt_credentials_trigger` | `supabase/migrations/20251217195149_f34162d1-b4f8-4108-823d-546922efead4.sql` | 239 |
| `on_project_member_created` | `supabase/migrations/20251217170855_41222af5-cd3e-48ab-ad05-682d4446018f.sql` | 132 |
| `on_project_created` | `supabase/migrations/20251208195657_dc083776-970d-4c7a-9292-6d41eb36eeef.sql` | 18 |
| `trigger_generate_project_public_code` | `supabase/migrations/20260103151201_8880d85a-3b13-477d-ae3b-286b36cad540.sql` | 42 |
| `update_sales_history_orders_updated_at` | `supabase/migrations/20260126131918_1ebdbb9b-bbeb-4de1-b092-4cecb9415a5c.sql` | 184 |

## Localização (opcionais)

| Trigger opcional | Arquivo | Linha |
|---|---|---:|
| `trigger_update_contact_financial` | `supabase/migrations/20251219231507_370ebcac-a009-482f-a288-90101ccbcfa5.sql` | 39 |
| `trigger_derive_order_status` | `supabase/migrations/20260130002840_f1473eb3-9465-470d-9a0c-c9822f16dcf0.sql` | 129 |
| `validate_ledger_events_v21_trigger` | `supabase/migrations/20260202003259_b17147a5-d57c-4019-b398-35d7cb934541.sql` | 48 |
| `update_funnel_metrics_on_path_event` | `supabase/migrations/20260111172009_d52ca940-9987-46bb-8f96-0d01e64b8635.sql` | 176 |
| `trigger_ensure_owner_permissions` | `supabase/migrations/20260106210022_ea8ef9fe-c181-4850-995b-3a71117514fa.sql` | 37 |
| `trigger_handle_role_change_to_owner` | `supabase/migrations/20260106210022_ea8ef9fe-c181-4850-995b-3a71117514fa.sql` | 75 |
| `sync_project_max_members_trigger` | `supabase/migrations/20260104144020_550ddfe5-ccc3-49df-bb1b-9b185265f738.sql` | 51 |
| `validate_quiz_slug` | `supabase/migrations/20260111200556_fa51acc3-31ba-4e3e-9c74-c6016582f8e7.sql` | 68 |
| `update_role_templates_updated_at` | `supabase/migrations/20260105184113_d7713b5c-0452-4f2f-800e-e38817041b85.sql` | 364 |
