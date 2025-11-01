import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { PaymentsModule } from './payments/payments.module';
import { IdempotencyService } from './idempotency/idempotency-service';
import { IdempotencyMiddleware } from './middlewares/idempotency-middleware';

@Module({
  imports: [
    PrometheusModule.register(),
    PaymentsModule],
  controllers: [],
  providers: [IdempotencyService],
})

export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes({ path: 'payments', method: RequestMethod.POST });
  }
}