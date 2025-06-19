// tests/order/test-utils.ts
import { OrderItem, Money, Order, CustomerId } from '../../src/order/domain/types';
import { createMoney, createOrder } from '../../src/order/domain/functions';
import { v4 as uuidv4 } from 'uuid';

const defaultCustomerId = uuidv4() as CustomerId;

// デフォルトテストデータの生成関数
export const createDefaultOrderItems = (): OrderItem[] => {
  const money = createMoney(1000, 'JPY');
  if (!money.success) throw new Error('Failed to create money');

  return [
    { productId: 'p1', quantity: 2, unitPrice: money.value }
  ];
};

// カスタムアサーション
export const expectValidationError = (
  items: OrderItem[],
  expectedError: string
) => {
  const result = createOrder(defaultCustomerId, items);
  if (result.success || !result.error.includes(expectedError)) {
    throw new Error(`Expected validation error containing "${expectedError}", but got: ${result.success ? 'success' : result.error}`);
  }
};

export const expectSuccess = (items: OrderItem[]) => {
  const result = createOrder(defaultCustomerId, items);
  if (!result.success) {
    throw new Error(`Expected success, but got error: ${result.error}`);
  }
  return result;
};
