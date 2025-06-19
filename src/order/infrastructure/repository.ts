// src/order/infrastructure/repository.ts
import { fromEither } from 'fp-ts/TaskEither';
import { right } from 'fp-ts/Either';
import { Order, OrderId, CustomerId } from '../domain/types';
import { OrderRepository } from '../application/service';
import { AppTaskEither } from '../../shared/types';

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();

  save(order: Order): AppTaskEither<Order> {
    this.orders.set(order.id, order);
    return fromEither(right(order));
  }

  findByCustomerId(customerId: CustomerId): AppTaskEither<readonly Order[]> {
    const orders = Array.from(this.orders.values())
      .filter(order => order.customerId === customerId);
    return fromEither(right(orders));
  }

  clear() { this.orders.clear(); }
  size() { return this.orders.size; }
}
