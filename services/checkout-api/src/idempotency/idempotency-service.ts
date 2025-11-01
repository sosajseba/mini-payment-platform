
import { Injectable } from '@nestjs/common';

@Injectable()
export class IdempotencyService {
  private readonly store = new Map<string, any>();

  async getResponse(key: string): Promise<any> {
    return this.store.get(key);
  }

  async saveResponse(key: string, response: any): Promise<void> {
    this.store.set(key, response);
  }
}