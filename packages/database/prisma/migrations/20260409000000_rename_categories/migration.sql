-- 카테고리명 원본 반영: Notion 예산표 기준
-- 거래/예산은 categoryId(FK)로 연결되어 있어 이름 변경만으로 안전

-- EXPENSE 카테고리 이름 변경
UPDATE "Category" SET name = '교통비' WHERE name = '교통' AND type = 'EXPENSE';
UPDATE "Category" SET name = '통신비' WHERE name = '통신' AND type = 'EXPENSE';
UPDATE "Category" SET name = '생활비' WHERE name = '생활' AND type = 'EXPENSE';
UPDATE "Category" SET name = '경조비' WHERE name = '경조' AND type = 'EXPENSE';
UPDATE "Category" SET name = '문화비' WHERE name = '문화' AND type = 'EXPENSE';

-- SAVING 카테고리 이름 변경
UPDATE "Category" SET name = '청약저축' WHERE name = '청약' AND type = 'SAVING';
UPDATE "Category" SET name = '연금저축' WHERE name = '연금' AND type = 'SAVING';

-- 새 카테고리 추가 (없으면 생성)
INSERT INTO "Category" (id, name, type, sort_order, is_active)
SELECT 'cat_sibling_contrib', '동생 기여금', 'EXPENSE', 9, true
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" WHERE name = '동생 기여금' AND type = 'EXPENSE'
);
