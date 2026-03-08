-- ============================================================
-- Migration 015: Seed default products from tableau_stock.xlsx
-- ============================================================
-- NOTE: This migration inserts products for every existing company.
-- For a brand-new database, register your account FIRST, then run
-- migrations so that at least one company_id exists.
-- ============================================================

DO $$
DECLARE
  v_company_id UUID;
  v_count      INTEGER;
BEGIN
  -- Run for every company that exists at migration time
  FOR v_company_id IN SELECT id FROM companies ORDER BY created_at LOOP

    INSERT INTO products
      (company_id, name, sku, selling_price, cost_price, current_stock, notes)
    VALUES
  (v_company_id, 'M&ms jaune', 'M-MS-JAUNE', 14.00, 0.00, 9.0000, 'Expiry: 08.03–19.04'),
  (v_company_id, 'M&ms bleu', 'M-MS-BLEU', 14.00, 0.00, 0.0000, NULL),
  (v_company_id, 'M&ms brun', 'M-MS-BRUN', 14.00, 0.00, 2.0000, 'Expiry: 08.03–12.07'),
  (v_company_id, 'Maltesees', 'MALTESEES', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Rafael', 'RAFAEL', 16.00, 0.00, 8.0000, 'Expiry: 14.05'),
  (v_company_id, 'Rocher', 'ROCHER', 22.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Chacha', 'CHACHA', 22.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Bounty', 'BOUNTY', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mars', 'MARS', 20.00, 0.00, 32.0000, 'Expiry: 20.08'),
  (v_company_id, 'Mars big', 'MARS-BIG', 22.00, 0.00, 24.0000, 'Expiry: 20.08'),
  (v_company_id, 'Snicker', 'SNICKER', 20.00, 0.00, 32.0000, 'Expiry: 20.09'),
  (v_company_id, 'Snicker big', 'SNICKER-BIG', 22.00, 0.00, 24.0000, NULL),
  (v_company_id, 'Leo go', 'LEO-GO', 25.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Milka noisette', 'MILKA-NOISETTE', 28.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Côte d’or', 'C-TE-D-OR', 25.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Oreo Golden', 'OREO-GOLDEN', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Oreo original', 'OREO-ORIGINAL', 0.00, 0.00, 7.0000, 'Expiry: 31.03–31.04'),
  (v_company_id, 'Milka Oreo biscuit', 'MILKA-OREO-BISCUIT', 0.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Milka sensation', 'MILKA-SENSATION', 19.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Leo', 'LEO', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Knopper', 'KNOPPER', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Teasor Choco', 'TEASOR-CHOCO', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Kit Kat', 'KIT-KAT', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Dragibus', 'DRAGIBUS', 13.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Twix', 'TWIX', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Twix extra', 'TWIX-EXTRA', 26.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Nutella go', 'NUTELLA-GO', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Nutella biscuit', 'NUTELLA-BISCUIT', 19.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Kinder délice', 'KINDER-D-LICE', 10.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Kinder card', 'KINDER-CARD', 18.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Aqua kiss', 'AQUA-KISS', 22.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mentos 3 fruits free', 'MENTOS-3-FRUITS-FREE', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mentos tablet', 'MENTOS-TABLET', 6.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Bubbliche', 'BUBBLICHE', 10.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Hollywood mix', 'HOLLYWOOD-MIX', 13.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Freedent', 'FREEDENT', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Stirmool', 'STIRMOOL', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mentos bottle', 'MENTOS-BOTTLE', 13.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mentos roll', 'MENTOS-ROLL', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Smarties', 'SMARTIES', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Jam breaker', 'JAM-BREAKER', 14.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Kinder b/w', 'KINDER-B-W', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Kinder joy', 'KINDER-JOY', 31.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Kinder surprise', 'KINDER-SURPRISE', 42.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Haribo boîte', 'HARIBO-BO-TE', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Lays', 'LAYS', 12.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Pringles', 'PRINGLES', 10.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Pringles big', 'PRINGLES-BIG', 35.00, 0.00, 0.0000, NULL),
  (v_company_id, 'War head', 'WAR-HEAD', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Chupa chup', 'CHUPA-CHUP', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Cable candy', 'CABLE-CANDY', 10.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Brick candy', 'BRICK-CANDY', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Toy', 'TOY', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Pipe', 'PIPE', 18.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Grinder', 'GRINDER', 18.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Bic small', 'BIC-SMALL', 26.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Bic big', 'BIC-BIG', 32.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Sasty lighter', 'SASTY-LIGHTER', 6.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Clipper', 'CLIPPER', 32.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Sac small', 'SAC-SMALL', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Sac big', 'SAC-BIG', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Club', 'CLUB', 53.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Top filter', 'TOP-FILTER', 18.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mascotte filter', 'MASCOTTE-FILTER', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Rizla big', 'RIZLA-BIG', 17.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Rizla carton', 'RIZLA-CARTON', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Top carton', 'TOP-CARTON', 24.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Books', 'BOOKS', 24.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Rizla small', 'RIZLA-SMALL', 23.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Raw carton', 'RAW-CARTON', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Top roll', 'TOP-ROLL', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Rizla micro', 'RIZLA-MICRO', 24.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Smoking normal mix', 'SMOKING-NORMAL-MIX', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Smoking + tips', 'SMOKING-TIPS', 22.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Smoking roll + tips', 'SMOKING-ROLL-TIPS', 26.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Top roll tips', 'TOP-ROLL-TIPS', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mascotte slim', 'MASCOTTE-SLIM', 29.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mascotte combi big', 'MASCOTTE-COMBI-BIG', 29.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mascotte combi small', 'MASCOTTE-COMBI-SMALL', 26.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Mascotte roll tips', 'MASCOTTE-ROLL-TIPS', 20.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Panasonic', 'PANASONIC', 15.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Duracell', 'DURACELL', 50.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Durex 12', 'DUREX-12', 18.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Durex 1p', 'DUREX-1P', 6.50, 0.00, 0.0000, NULL),
  (v_company_id, 'Nesquick', 'NESQUICK', 15.00, 0.00, 5.0000, 'Expiry: 20.09'),
  (v_company_id, 'Chocapik', 'CHOCAPIK', 15.00, 0.00, 1.0000, 'Expiry: 20.09'),
  (v_company_id, 'Crunch', 'CRUNCH', 0.00, 0.00, 1.0000, 'Expiry: 20.03'),
  (v_company_id, 'Pizza', 'PIZZA', 0.00, 0.00, 3.0000, 'Expiry: 29.04'),
  (v_company_id, 'Atomik balls', 'ATOMIK-BALLS', 0.00, 0.00, 6.0000, 'Expiry: 2027'),
  (v_company_id, 'Sour choc roky', 'SOUR-CHOC-ROKY', 0.00, 0.00, 4.0000, NULL),
  (v_company_id, 'Tic tac', 'TIC-TAC', 0.00, 0.00, 12.0000, NULL),
  (v_company_id, 'Frisk bleu', 'FRISK-BLEU', 0.00, 0.00, 3.0000, NULL),
  (v_company_id, 'Frisk green', 'FRISK-GREEN', 0.00, 0.00, 8.0000, NULL),
  (v_company_id, 'Stimorol', 'STIMOROL', 16.00, 0.00, 0.0000, NULL),
  (v_company_id, 'Freedent', 'FREEDENT-2', 21.00, 0.00, 0.0000, 'Expiry: 09.03'),
  (v_company_id, 'Bubblicious jaune', 'BUBBLICIOUS-JAUNE', 0.00, 0.00, 12.0000, NULL),
  (v_company_id, 'Bubblicious rose', 'BUBBLICIOUS-ROSE', 0.00, 0.00, 9.0000, NULL),
  (v_company_id, 'Bubblicious cola', 'BUBBLICIOUS-COLA', 0.00, 0.00, 2.0000, NULL)
    ON CONFLICT (company_id, sku) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Company %: % products seeded', v_company_id, v_count;

  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No companies found — skipping product seed. Register an account first, then re-run migrations.';
  END IF;
END;
$$;
