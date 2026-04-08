import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BudgetModule } from './budget/budget.module';
import { StockModule } from './stock/stock.module';
import { MigrationModule } from './migration/migration.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ...(process.env.NODE_ENV !== 'production' && {
        envFilePath: ['../../.env', '.env'],
      }),
    }),
    PrismaModule,
    AuthModule,
    BudgetModule,
    StockModule,
    MigrationModule,
    HealthModule,
  ],
})
export class AppModule {}
