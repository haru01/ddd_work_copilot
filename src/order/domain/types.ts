// src/order/domain/types.ts
import { z } from 'zod';
import { UUID } from '../../shared/types';

// === ブランド型 ===
export type OrderId = UUID & { readonly _orderBrand: unique symbol };
export type CustomerId = UUID & { readonly _customerBrand: unique symbol };

// === Zodスキーマによる型定義 ===
export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/)
});

export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
  unitPrice: MoneySchema
});

// 代数的データ型（Zod discriminatedUnion）
export const OrderStatusSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('DRAFT'), createdAt: z.date() }),
  z.object({
    type: z.literal('PLACED'),
    placedAt: z.date(),
    paymentId: z.string().min(1)
  }),
  z.object({
    type: z.literal('SHIPPED'),
    shippedAt: z.date(),
    trackingCode: z.string().min(1)
  }),
  z.object({ type: z.literal('DELIVERED'), deliveredAt: z.date() }),
  z.object({
    type: z.literal('CANCELLED'),
    cancelledAt: z.date(),
    reason: z.string().min(5)
  })
]);

export const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1).max(10),
  status: OrderStatusSchema,
  totalAmount: MoneySchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// === 型推論 ===
export type Money = z.infer<typeof MoneySchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;

// === 型ガード ===
export const isDraft = (status: OrderStatus): status is { type: 'DRAFT'; createdAt: Date } =>
  status.type === 'DRAFT';

export const isPlaced = (status: OrderStatus): status is { type: 'PLACED'; placedAt: Date; paymentId: string } =>
  status.type === 'PLACED';

export const canBeCancelled = (order: Order): boolean =>
  isDraft(order.status) || isPlaced(order.status);
