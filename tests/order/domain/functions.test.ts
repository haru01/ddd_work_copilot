// tests/order/domain/functions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createOrder, placeOrder, cancelOrder, createMoney } from '../../../src/order/domain/functions';
import { CustomerId, OrderItem, Order } from '../../../src/order/domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('Order Domain Functions', () => {
  const customerId = uuidv4() as CustomerId;

  describe('createOrder', () => {
    describe('正常系', () => {
      it('有効な注文を作成できる', () => {
        const money = createMoney(1000, 'JPY');
        expect(money.success).toBe(true);

        if (money.success) {
          const items: OrderItem[] = [
            { productId: 'p1', quantity: 2, unitPrice: money.value }
          ];
          const result = createOrder(customerId, items);

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value.status.type).toBe('DRAFT');
            expect(result.value.totalAmount.amount).toBe(2000);
            expect(result.value.items).toHaveLength(1);
          }
        }
      });
    });

    describe('バリデーションエラー', () => {
      describe('商品の検証', () => {
        it('空の商品リストはエラー', () => {
          const result = createOrder(customerId, []);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('Array must contain at least 1 element(s)');
          }
        });

        it.skip('重複商品はエラー', () => {
          const money = createMoney(1000, 'JPY');
          if (money.success) {
            const items: OrderItem[] = [
              { productId: 'p1', quantity: 1, unitPrice: money.value },
              { productId: 'p1', quantity: 2, unitPrice: money.value }
            ];
            const result = createOrder(customerId, items);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error).toContain('同じ商品を複数回追加');
            }
          }
        });

        it.skip('異なる通貨の混在はエラー', () => {
          const jpyMoney = createMoney(1000, 'JPY');
          const usdMoney = createMoney(10, 'USD');
          if (jpyMoney.success && usdMoney.success) {
            const items: OrderItem[] = [
              { productId: 'p1', quantity: 1, unitPrice: jpyMoney.value },
              { productId: 'p2', quantity: 1, unitPrice: usdMoney.value }
            ];
            const result = createOrder(customerId, items);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error).toContain('同じ通貨である必要');
            }
          }
        });
      });
    });

    describe('境界値テスト', () => {
      it('商品数が上限10個まで登録できる', () => {
        const money = createMoney(1000, 'JPY');
        if (money.success) {
          const items: OrderItem[] = Array.from({ length: 10 }, (_, i) => ({
            productId: `p${i + 1}`,
            quantity: 1,
            unitPrice: money.value
          }));

          const result = createOrder(customerId, items);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value.items).toHaveLength(10);
          }
        }
      });

      it.skip('商品数が11個以上はエラー', () => {
        const money = createMoney(1000, 'JPY');
        if (money.success) {
          const items: OrderItem[] = Array.from({ length: 11 }, (_, i) => ({
            productId: `p${i + 1}`,
            quantity: 1,
            unitPrice: money.value
          }));

          const result = createOrder(customerId, items);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('商品は10個まで');
          }
        }
      });
    });
  });

  describe('状態遷移のテスト', () => {
    let draftOrder: Order;

    beforeEach(() => {
      const money = createMoney(1000, 'JPY');
      if (money.success) {
        const items: OrderItem[] = [
          { productId: 'p1', quantity: 1, unitPrice: money.value }
        ];
        const result = createOrder(customerId, items);
        if (result.success) {
          draftOrder = result.value;
        }
      }
    });

    it('DRAFTからPLACEDへの遷移', () => {
      const result = placeOrder(draftOrder, 'payment123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status.type).toBe('PLACED');
        expect((result.value.status as any).paymentId).toBe('payment123');
      }
    });

    it.skip('PLACEDの注文はキャンセルできる', () => {
      const placedResult = placeOrder(draftOrder, 'payment123');
      if (placedResult.success) {
        const cancelResult = cancelOrder(placedResult.value, 'Customer request');

        expect(cancelResult.success).toBe(true);
        if (cancelResult.success) {
          expect(cancelResult.value.status.type).toBe('CANCELLED');
        }
      }
    });

    it.skip('SHIPPEDの注文はキャンセルできない', () => {
      // SHIPPEDステータスの注文を作成
      const shippedOrder: Order = {
        ...draftOrder,
        status: { type: 'SHIPPED', shippedAt: new Date(), trackingCode: 'TRACK123' }
      };

      const result = cancelOrder(shippedOrder, 'Too late');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('キャンセル不可');
      }
    });
  });
});
