-- ============================================================
-- Migration 015: Seed default products (MySQL)
-- ============================================================
-- NOTE: This migration inserts products for every existing company.
-- For a brand-new database, register your account FIRST, then run
-- migrations so that at least one company_id exists.
-- ============================================================

-- MySQL doesn't support DO $$ blocks. We use INSERT IGNORE to skip duplicates.
INSERT IGNORE INTO products (id, company_id, name, sku, selling_price, cost_price, current_stock, notes)
SELECT UUID(), c.id, p.name, p.sku, p.selling_price, p.cost_price, p.current_stock, p.notes
FROM companies c
CROSS JOIN (
  SELECT 'M&ms jaune' AS name, 'M-MS-JAUNE' AS sku, 14.00 AS selling_price, 0.00 AS cost_price, 9.0000 AS current_stock, 'Expiry: 08.03-19.04' AS notes
  UNION ALL SELECT 'M&ms bleu', 'M-MS-BLEU', 14.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'M&ms brun', 'M-MS-BRUN', 14.00, 0.00, 2.0000, 'Expiry: 08.03-12.07'
  UNION ALL SELECT 'Maltesees', 'MALTESEES', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Rafael', 'RAFAEL', 16.00, 0.00, 8.0000, 'Expiry: 14.05'
  UNION ALL SELECT 'Rocher', 'ROCHER', 22.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Chacha', 'CHACHA', 22.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Bounty', 'BOUNTY', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Mars', 'MARS', 20.00, 0.00, 32.0000, 'Expiry: 20.08'
  UNION ALL SELECT 'Mars big', 'MARS-BIG', 22.00, 0.00, 24.0000, 'Expiry: 20.08'
  UNION ALL SELECT 'Snicker', 'SNICKER', 20.00, 0.00, 32.0000, 'Expiry: 20.09'
  UNION ALL SELECT 'Snicker big', 'SNICKER-BIG', 22.00, 0.00, 24.0000, NULL
  UNION ALL SELECT 'Leo go', 'LEO-GO', 25.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Milka noisette', 'MILKA-NOISETTE', 28.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Oreo Golden', 'OREO-GOLDEN', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Oreo original', 'OREO-ORIGINAL', 0.00, 0.00, 7.0000, 'Expiry: 31.03-31.04'
  UNION ALL SELECT 'Milka Oreo biscuit', 'MILKA-OREO-BISCUIT', 0.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Milka sensation', 'MILKA-SENSATION', 19.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Leo', 'LEO', 20.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Knopper', 'KNOPPER', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Teasor Choco', 'TEASOR-CHOCO', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Kit Kat', 'KIT-KAT', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Dragibus', 'DRAGIBUS', 13.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Twix', 'TWIX', 20.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Twix extra', 'TWIX-EXTRA', 26.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Nutella go', 'NUTELLA-GO', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Nutella biscuit', 'NUTELLA-BISCUIT', 19.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Kinder card', 'KINDER-CARD', 18.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Aqua kiss', 'AQUA-KISS', 22.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Mentos 3 fruits free', 'MENTOS-3-FRUITS-FREE', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Mentos tablet', 'MENTOS-TABLET', 6.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Bubbliche', 'BUBBLICHE', 10.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Hollywood mix', 'HOLLYWOOD-MIX', 13.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Freedent', 'FREEDENT', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Stirmool', 'STIRMOOL', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Mentos bottle', 'MENTOS-BOTTLE', 13.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Mentos roll', 'MENTOS-ROLL', 20.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Smarties', 'SMARTIES', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Jam breaker', 'JAM-BREAKER', 14.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Kinder joy', 'KINDER-JOY', 31.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Kinder surprise', 'KINDER-SURPRISE', 42.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Lays', 'LAYS', 12.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Pringles', 'PRINGLES', 10.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Pringles big', 'PRINGLES-BIG', 35.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'War head', 'WAR-HEAD', 20.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Chupa chup', 'CHUPA-CHUP', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Toy', 'TOY', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Pipe', 'PIPE', 18.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Grinder', 'GRINDER', 18.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Bic small', 'BIC-SMALL', 26.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Bic big', 'BIC-BIG', 32.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Clipper', 'CLIPPER', 32.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Club', 'CLUB', 53.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Nesquick', 'NESQUICK', 15.00, 0.00, 5.0000, 'Expiry: 20.09'
  UNION ALL SELECT 'Chocapik', 'CHOCAPIK', 15.00, 0.00, 1.0000, 'Expiry: 20.09'
  UNION ALL SELECT 'Stimorol', 'STIMOROL', 16.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Panasonic', 'PANASONIC', 15.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Duracell', 'DURACELL', 50.00, 0.00, 0.0000, NULL
  UNION ALL SELECT 'Durex 12', 'DUREX-12', 18.00, 0.00, 0.0000, NULL
) p;
