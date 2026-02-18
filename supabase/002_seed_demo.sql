-- ============================================================
-- ADS-SQUARE — Seed Démo (données de test)
-- À exécuter APRÈS 001_schema.sql
-- ============================================================

-- Créer quelques annonceurs démo
INSERT INTO advertisers (id, email, display_name, profile_type, website_url) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'demo-nike@ads-square.com', 'NikeKicks Studio', 'brand', 'https://nike.com'),
  ('a1000000-0000-0000-0000-000000000002', 'demo-spotify@ads-square.com', 'Spotify Ads', 'brand', 'https://spotify.com'),
  ('a1000000-0000-0000-0000-000000000003', 'demo-saas@ads-square.com', 'SaaS Vision', 'freelance', 'https://example.com'),
  ('a1000000-0000-0000-0000-000000000004', 'demo-techstream@ads-square.com', 'TechStream TV', 'creator', 'https://example.com'),
  ('a1000000-0000-0000-0000-000000000005', 'demo-airbnb@ads-square.com', 'Airbnb', 'brand', 'https://airbnb.com');

-- Bookings démo (statut 'active', dates larges pour les tests)
-- ⚠️ La RLS bloque les INSERT via anon key.
-- Exécutez ceci dans le SQL Editor (qui utilise service_role).

-- ÉPICENTRE (18,18) — le bloc central
INSERT INTO bookings (
  slot_x, slot_y, advertiser_id, status, start_date, end_date,
  amount_cents, content_type, display_name, slogan, logo_initials,
  primary_color, background_color, cta_text, cta_url, image_url, badge
) VALUES (
  18, 18,
  'a1000000-0000-0000-0000-000000000001',
  'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
  100000, 'image', 'NikeKicks Studio', 'Just Do It — Air Max 2025', 'NK',
  '#ff6b35', '#160800', 'Voir la collection', 'https://nike.com',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'MARQUE'
);

-- PRESTIGE (16,18) — anneau intérieur
INSERT INTO bookings (
  slot_x, slot_y, advertiser_id, status, start_date, end_date,
  amount_cents, content_type, display_name, slogan, logo_initials,
  primary_color, background_color, cta_text, cta_url, image_url, badge
) VALUES (
  16, 18,
  'a1000000-0000-0000-0000-000000000002',
  'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
  10000, 'video', 'Spotify Ads', 'Faites entendre votre marque', 'SP',
  '#1ed760', '#001409', 'Lancer une campagne', 'https://spotify.com',
  'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&q=80',
  'MARQUE'
);

-- BUSINESS (10,10) — zone intermédiaire
INSERT INTO bookings (
  slot_x, slot_y, advertiser_id, status, start_date, end_date,
  amount_cents, content_type, display_name, slogan, logo_initials,
  primary_color, background_color, cta_text, cta_url, badge
) VALUES (
  10, 10,
  'a1000000-0000-0000-0000-000000000003',
  'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
  1000, 'link', 'SaaS Vision', 'Automatisez votre croissance B2B', 'SV',
  '#c5d3e8', '#08121e', 'Essai 14 jours', 'https://example.com',
  'FREELANCE'
);

-- CORNER (0,0) — coin haut-gauche
INSERT INTO bookings (
  slot_x, slot_y, advertiser_id, status, start_date, end_date,
  amount_cents, content_type, display_name, slogan, logo_initials,
  primary_color, background_color, cta_text, cta_url, image_url, badge
) VALUES (
  0, 0,
  'a1000000-0000-0000-0000-000000000005',
  'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days',
  10000, 'image', 'Airbnb', 'Vivez comme un local', 'AB',
  '#ff5a5f', '#110002', 'Explorer', 'https://airbnb.com',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'MARQUE'
);

-- VIRAL (2,2) — zone extérieure
INSERT INTO bookings (
  slot_x, slot_y, advertiser_id, status, start_date, end_date,
  amount_cents, content_type, display_name, slogan, logo_initials,
  primary_color, background_color, cta_text, cta_url, image_url, badge
) VALUES (
  2, 2,
  'a1000000-0000-0000-0000-000000000004',
  'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
  100, 'video', 'TechStream TV', 'Le streaming tech — 24h/24', 'TS',
  '#e31937', '#100002', 'Regarder', 'https://example.com',
  'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80',
  'CRÉATEUR'
);

-- ============================================================
-- ✅ 5 bookings démo créés
-- Vérifier : SELECT * FROM active_slots WHERE is_occupied = true;
-- Stats    : SELECT * FROM grid_stats;
-- ============================================================
