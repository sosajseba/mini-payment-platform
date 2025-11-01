import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsNotEmpty()
  @Min(1)
  amount_cents: bigint;

  @ApiProperty()
  @IsNotEmpty()
  @Length(3, 3)
  currency: string;
}