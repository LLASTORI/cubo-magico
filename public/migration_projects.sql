-- ============================================================================
-- MIGRAÇÃO: projects
-- Gerado em: 2026-02-07
-- ============================================================================

INSERT INTO public.projects (id, user_id, name, description, public_code, is_active, max_members, created_at, updated_at) VALUES
('a59d30c7-1009-4aa2-b106-6826011466e9', '9bb7f3a7-9ca3-4e00-ae91-71958dd78881', 'Camila Leal', NULL, 'cm_2nxxd9', true, 5, '2025-12-11 18:35:06.401049+00', '2026-01-04 14:45:53.802086+00'),
('ae0894d4-6212-49f5-8b87-0b5a8cc11455', '9bb7f3a7-9ca3-4e00-ae91-71958dd78881', 'Natalia Canezin', NULL, 'cm_asgm37', true, 5, '2025-12-11 19:04:30.891611+00', '2026-01-04 14:45:53.802086+00'),
('41f3c092-b3f4-4211-b80e-9d4e4f3a1e45', '9bb7f3a7-9ca3-4e00-ae91-71958dd78881', 'Leandro Lastori', NULL, 'cm_50r2xr', true, 5, '2025-12-29 14:47:54.60479+00', '2026-01-04 14:45:53.802086+00'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '3ea295e2-2b1f-4ecc-ac8a-4b0a03cb19f1', 'Demo Meta Review', 'Projeto de demonstração para revisores da Meta', 'cm_s55geu', true, 5, '2026-01-01 14:56:58.476113+00', '2026-01-04 14:45:53.802086+00'),
('1e1a89a4-81d5-4aa7-8431-538828def2a3', '9bb7f3a7-9ca3-4e00-ae91-71958dd78881', 'Alice Salazar', 'Projeto migrado com dados existentes', 'cm_bafbrk', true, 10, '2025-12-03 01:50:09.042635+00', '2026-01-04 15:18:31.647892+00'),
('b92c4dfd-d220-4a80-bac2-c9779a336548', '9bb7f3a7-9ca3-4e00-ae91-71958dd78881', 'James Olaya', NULL, 'cm_w0tq0x', true, 5, '2026-01-27 13:05:00.517143+00', '2026-01-27 13:05:00.517143+00'),
('7f44b177-5255-4393-a648-3f0dfc681be9', '9bb7f3a7-9ca3-4e00-ae91-71958dd78881', 'Lilian Anacleto', 'Coisas de RH', 'cm_ufy6m1', true, 5, '2026-01-27 18:56:02.737758+00', '2026-01-27 18:56:02.737758+00')
ON CONFLICT (id) DO NOTHING;
