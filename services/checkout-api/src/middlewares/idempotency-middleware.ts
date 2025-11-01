import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from 'src/idempotency/idempotency-service';
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency key is missing');
    }

    const cachedResponse = await this.idempotencyService.getResponse(idempotencyKey);
    if (cachedResponse) {
      res.status(200).json(cachedResponse);
    } else {
      res.on('finish', async () => {
        if (res.statusCode < 400) {
          await this.idempotencyService.saveResponse(idempotencyKey, res.locals.response);
        }
      });
      next();
    }
  }
}