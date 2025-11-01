import { BadRequestException, Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { ApiHeader } from '@nestjs/swagger';

@Controller('payments')
export class PaymentsController {
  
  constructor(private readonly paymentService: PaymentsService) {}

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    try {
      this.paymentService.createPaymentIntent(createPaymentDto.amount_cents, createPaymentDto.currency);
      const response = { amount_cents: createPaymentDto.amount_cents, coins: createPaymentDto.currency };
      return response;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
    
  @Get()
  findAll(@Req() request: Request): string {
    return 'This action returns all payment intents';
  }
}