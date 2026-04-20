-- 2-depth 카테고리 지원: parentId(self-ref) 추가
-- 기존 카테고리는 모두 parentId=NULL인 leaf로 유지되어 데이터 손실 없음
-- 스타일: init 마이그레이션 (20260323001543_init)과 일관되게 비한정자 사용
-- (Prisma multiSchema가 search_path를 my_wallet으로 설정)

-- AlterTable: parent_id 컬럼 추가
ALTER TABLE "categories" ADD COLUMN "parent_id" TEXT;

-- DropIndex: 기존 unique(name, type) 제거
DROP INDEX IF EXISTS "categories_name_type_key";

-- CreateIndex: 확장된 unique(name, type, parent_id)
-- 주의: parent_id가 NULL이면 PostgreSQL 표준상 "distinct"로 간주되어
-- 같은 (name, type, NULL) 로우가 복수 존재 가능. 애플리케이션 레이어에서
-- 중복 루트 카테고리 생성을 차단한다 (CategoryController).
CREATE UNIQUE INDEX "categories_name_type_parent_id_key"
  ON "categories"("name", "type", "parent_id");

-- CreateIndex: parent_id 단독 조회용
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- AddForeignKey: self-referential FK (RESTRICT: 자식 있는 부모 삭제 차단)
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
