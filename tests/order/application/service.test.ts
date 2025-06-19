// tests/order/application/service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { OrderService, OrderRepository } from '../../../src/order/application/service';
import { InMemoryOrderRepository } from '../../../src/order/infrastructure/repository';
import { createMoney } from '../../../src/order/domain/functions';
import { CustomerId, OrderItem, Order } from '../../../src/order/domain/types';
import { AppTaskEither } from '../../../src/shared/types';
import { v4 as uuidv4 } from 'uuid';

describe('OrderService', () => {
  let orderService: OrderService;
  let repository: InMemoryOrderRepository;
  let customerId: CustomerId;
  let validOrderItems: OrderItem[];

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    orderService = new OrderService(repository);
    customerId = uuidv4() as CustomerId;

    const money = createMoney(1000, 'JPY');
    if (money.success) {
      validOrderItems = [
        { productId: 'p1', quantity: 2, unitPrice: money.value },
        { productId: 'p2', quantity: 1, unitPrice: money.value }
      ];
    }
  });

  describe('createOrder', () => {
    it('有効な注文を作成して保存できる', async () => {
      const result = await orderService.createOrder(customerId, validOrderItems)();

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        const order = result.right;
        expect(order.customerId).toBe(customerId);
        expect(order.items).toHaveLength(2);
        expect(order.status.type).toBe('DRAFT');
        expect(order.totalAmount.amount).toBe(3000);
        expect(order.totalAmount.currency).toBe('JPY');
      }

      // リポジトリに保存されていることを確認
      expect(repository.size()).toBe(1);
    });

    it('無効な注文データでValidationErrorが返される', async () => {
      const invalidItems: OrderItem[] = []; // 空の配列

      const result = await orderService.createOrder(customerId, invalidItems)();

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left.type).toBe('ValidationError');
        expect(result.left.message).toContain('Array must contain at least 1 element(s)');
      }

      // リポジトリには保存されていないことを確認
      expect(repository.size()).toBe(0);
    });
  });

  describe('getOrdersByCustomer', () => {
    it('顧客の注文一覧を取得できる', async () => {
      // 事前に注文を作成
      await orderService.createOrder(customerId, validOrderItems)();
      await orderService.createOrder(customerId, validOrderItems)();

      const result = await orderService.getOrdersByCustomer(customerId)();

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        const orders = result.right;
        expect(orders).toHaveLength(2);
        orders.forEach(order => {
          expect(order.customerId).toBe(customerId);
        });
      }
    });

    it('注文がない顧客の場合は空配列が返される', async () => {
      const anotherCustomerId = uuidv4() as CustomerId;

      const result = await orderService.getOrdersByCustomer(anotherCustomerId)();

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toHaveLength(0);
      }
    });
  });

  describe('placeOrder', () => {
    it.skip('注文を確定できる（未実装）', async () => {
      // TODO: findById機能を実装後にテストを有効化
      const orderId = uuidv4() as any;
      const paymentId = 'payment-123';

      const result = await orderService.placeOrder(orderId, paymentId)();

      expect(result._tag).toBe('Right');
    });
  });

  describe('cancelOrder', () => {
    it.skip('注文をキャンセルできる（未実装）', async () => {
      // TODO: findById機能を実装後にテストを有効化
      const orderId = uuidv4() as any;
      const reason = 'Customer request';

      const result = await orderService.cancelOrder(orderId, reason)();

      expect(result._tag).toBe('Right');
    });
  });
});
