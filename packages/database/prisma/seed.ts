import { PrismaClient, TransactionType } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. 기본 사용자 생성
  const user = await prisma.user.upsert({
    where: { email: 'admin@my-wallet.local' },
    update: {},
    create: {
      email: 'admin@my-wallet.local',
      password: await bcrypt.hash('admin1234', 10),
      name: '관리자',
    },
  });
  console.log(`User created: ${user.name} (${user.email})`);

  // 2. 카테고리 생성
  const expenseCategories = [
    { name: '식비', sortOrder: 1 },
    { name: '교통', sortOrder: 2 },
    { name: '통신', sortOrder: 3 },
    { name: '월세', sortOrder: 4 },
    { name: '생활', sortOrder: 5 },
    { name: '경조', sortOrder: 6 },
    { name: '문화', sortOrder: 7 },
    { name: '공과금', sortOrder: 8 },
    { name: '기타', sortOrder: 99 },
  ];

  const savingCategories = [
    { name: '보험', sortOrder: 1 },
    { name: '청약', sortOrder: 2 },
    { name: '연금', sortOrder: 3 },
    { name: '투자', sortOrder: 4 },
  ];

  const incomeCategories = [
    { name: '급여', sortOrder: 1 },
    { name: '기타', sortOrder: 99 },
  ];

  for (const cat of expenseCategories) {
    await prisma.category.upsert({
      where: { name_type: { name: cat.name, type: TransactionType.EXPENSE } },
      update: { sortOrder: cat.sortOrder },
      create: { name: cat.name, type: TransactionType.EXPENSE, sortOrder: cat.sortOrder },
    });
  }

  for (const cat of savingCategories) {
    await prisma.category.upsert({
      where: { name_type: { name: cat.name, type: TransactionType.SAVING } },
      update: { sortOrder: cat.sortOrder },
      create: { name: cat.name, type: TransactionType.SAVING, sortOrder: cat.sortOrder },
    });
  }

  for (const cat of incomeCategories) {
    await prisma.category.upsert({
      where: { name_type: { name: cat.name, type: TransactionType.INCOME } },
      update: { sortOrder: cat.sortOrder },
      create: { name: cat.name, type: TransactionType.INCOME, sortOrder: cat.sortOrder },
    });
  }

  console.log('Categories seeded');

  // 3. 주식 종목 생성
  const stocks = [
    { code: '000660', name: 'SK하이닉스' },
    { code: '005930', name: '삼성전자' },
    { code: '005935', name: '삼성전자 우' },
    { code: '005380', name: '현대자동차' },
    { code: '329180', name: 'HD현대중공업' },
    { code: '105560', name: 'KB금융' },
    { code: '402340', name: 'SK스퀘어' },
    { code: '042700', name: '한미반도체' },
    { code: '373220', name: 'LG에너지솔루션' },
    { code: '207940', name: '삼성바이오로직스' },
    { code: '032820', name: '우리기술' },
    { code: '006800', name: '미래에셋증권' },
    { code: '069500', name: 'KODEX 200' },
    { code: '279570', name: '케이뱅크' },
    { code: '379800', name: 'KODEX 미국S&P500' },
    { code: '458730', name: 'TIGER 미국배당다우존스' },
    { code: '058470', name: '리노공업' },
  ];

  for (const stock of stocks) {
    await prisma.stock.upsert({
      where: { code: stock.code },
      update: { name: stock.name },
      create: { code: stock.code, name: stock.name, market: 'KRX' },
    });
  }

  console.log('Stocks seeded');

  // 4. 증권 계좌 생성
  const accounts = [
    { type: 'GENERAL' as const, broker: '키움증권' },
    { type: 'ISA' as const, broker: '키움증권' },
    { type: 'PENSION' as const, broker: '키움증권' },
    { type: 'GENERAL' as const, broker: '삼성증권' },
    { type: 'GENERAL' as const, broker: 'KB증권' },
    { type: 'GENERAL' as const, broker: '토스 증권' },
  ];

  for (const acc of accounts) {
    await prisma.stockAccount.upsert({
      where: {
        userId_type_broker: {
          userId: user.id,
          type: acc.type,
          broker: acc.broker,
        },
      },
      update: {},
      create: {
        userId: user.id,
        type: acc.type,
        broker: acc.broker,
      },
    });
  }

  console.log('Stock accounts seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
