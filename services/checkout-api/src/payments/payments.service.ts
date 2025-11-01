import { Injectable } from '@nestjs/common';

interface PaymentIntent {
  amount_cents: bigint;
  currency: string;
}

@Injectable()
export class PaymentsService {

  createPaymentIntent(amount_cents: bigint, currency: string): void {
    
  }
}