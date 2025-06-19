// src/order/application/service.ts
import { TaskEither, chain, fromEither } from 'fp-ts/TaskEither';
import { right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { Order, OrderId, CustomerId, OrderItem } from '../domain/types';
import { createOrder, placeOrder, cancelOrder } from '../domain/functions';
import { AppTaskEither, validationError, resultToEither } from '../../shared/types';

export interface OrderRepository {
  save(order: Order): AppTaskEither<Order>;
  findByCustomerId(customerId: CustomerId): AppTaskEither<readonly Order[]>;
}

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  createOrder(customerId: CustomerId, items: readonly OrderItem[]): AppTaskEither<Order> {
    return pipe(
      fromEither(resultToEither(createOrder(customerId, items))),
      chain((order: Order) => this.repository.save(order))
    );
  }

  placeOrder(orderId: OrderId, paymentId: string): AppTaskEither<Order> {
    // 実際の実装では findById を使用
    return fromEither(right({} as Order));
  }

  cancelOrder(orderId: OrderId, reason: string): AppTaskEither<Order> {
    // 実際の実装では findById を使用
    return fromEither(right({} as Order));
  }

  getOrdersByCustomer(customerId: CustomerId): AppTaskEither<readonly Order[]> {
    return this.repository.findByCustomerId(customerId);
  }
}
