// src/order/domain/functions.ts
import { v4 as uuidv4 } from 'uuid';
import { Result } from '../../shared/types';
import {
  Order, OrderId, CustomerId, OrderItem, OrderStatus, Money,
  OrderSchema, MoneySchema, OrderStatusSchema, isDraft, canBeCancelled
} from './types';

// === ID生成 ===
export const createOrderId = (): OrderId => uuidv4() as OrderId;

// === Value Object構築（Zodバリデーション） ===
export const createMoney = (amount: number, currency: string): Result<Money> => {
  const result = MoneySchema.safeParse({ amount, currency });
  return result.success
    ? { success: true, value: result.data }
    : { success: false, error: result.error.errors[0]?.message || 'Invalid money' };
};

// === 状態ファクトリ（Zodバリデーション） ===
export const OrderStatusFactory = {
  draft: (): OrderStatus => ({ type: 'DRAFT', createdAt: new Date() }),

  placed: (paymentId: string): Result<OrderStatus> => {
    const result = OrderStatusSchema.safeParse({
      type: 'PLACED',
      placedAt: new Date(),
      paymentId
    });
    return result.success
      ? { success: true, value: result.data }
      : { success: false, error: result.error.errors[0]?.message || 'Invalid status' };
  },

  shipped: (trackingCode: string): Result<OrderStatus> => {
    const result = OrderStatusSchema.safeParse({
      type: 'SHIPPED',
      shippedAt: new Date(),
      trackingCode
    });
    return result.success
      ? { success: true, value: result.data }
      : { success: false, error: result.error.errors[0]?.message || 'Invalid status' };
  },

  cancelled: (reason: string): Result<OrderStatus> => {
    const result = OrderStatusSchema.safeParse({
      type: 'CANCELLED',
      cancelledAt: new Date(),
      reason
    });
    return result.success
      ? { success: true, value: result.data }
      : { success: false, error: result.error.errors[0]?.message || 'Invalid status' };
  }
};

// === ビジネスロジック ===
const calculateTotalAmount = (items: readonly OrderItem[]): Money => {
  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice.amount), 0);
  return { amount: total, currency: items[0]?.unitPrice.currency || 'JPY' };
};

export const createOrder = (customerId: CustomerId, items: readonly OrderItem[]): Result<Order> => {
  const now = new Date();
  const order = {
    id: createOrderId(),
    customerId,
    items,
    status: OrderStatusFactory.draft(),
    totalAmount: calculateTotalAmount(items),
    createdAt: now,
    updatedAt: now
  };

  // Zodスキーマ検証（重複商品チェック含む）
  const result = OrderSchema.safeParse(order);
  return result.success
    ? { success: true, value: result.data }
    : { success: false, error: result.error.errors[0]?.message || 'Invalid order' };
};

export const placeOrder = (order: Order, paymentId: string): Result<Order> => {
  if (!isDraft(order.status)) {
    return { success: false, error: `ドラフト状態のみ確定可能。現在: ${order.status.type}` };
  }

  const statusResult = OrderStatusFactory.placed(paymentId);
  if (!statusResult.success) return statusResult;

  const updatedOrder = { ...order, status: statusResult.value, updatedAt: new Date() };

  // Zodスキーマ検証
  const result = OrderSchema.safeParse(updatedOrder);
  return result.success
    ? { success: true, value: result.data }
    : { success: false, error: result.error.errors[0]?.message || 'Invalid order' };
};

export const cancelOrder = (order: Order, reason: string): Result<Order> => {
  if (!canBeCancelled(order)) {
    return { success: false, error: `キャンセル不可。現在: ${order.status.type}` };
  }

  const statusResult = OrderStatusFactory.cancelled(reason);
  if (!statusResult.success) return statusResult;

  const updatedOrder = { ...order, status: statusResult.value, updatedAt: new Date() };

  // Zodスキーマ検証
  const result = OrderSchema.safeParse(updatedOrder);
  return result.success
    ? { success: true, value: result.data }
    : { success: false, error: result.error.errors[0]?.message || 'Invalid order' };
};
