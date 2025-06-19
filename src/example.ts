// src/example.ts
import { createOrder, createMoney, placeOrder } from './order/domain/functions';
import { CustomerId, OrderItem } from './order/domain/types';
import { v4 as uuidv4 } from 'uuid';

console.log('TypeScript関数型DDDサンプルの実行開始');

// 金額の作成
const money = createMoney(1000, 'JPY');
if (!money.success) {
  console.error('金額作成エラー:', money.error);
  process.exit(1);
}

// 注文アイテムの作成
const items: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: money.value },
  { productId: 'p2', quantity: 1, unitPrice: money.value }
];

// 注文の作成
const orderResult = createOrder(uuidv4() as CustomerId, items);
if (!orderResult.success) {
  console.error('注文作成エラー:', orderResult.error);
  process.exit(1);
}

console.log('注文が正常に作成されました:');
console.log('- 注文ID:', orderResult.value.id);
console.log('- ステータス:', orderResult.value.status.type);
console.log('- 合計金額:', orderResult.value.totalAmount.amount, orderResult.value.totalAmount.currency);
console.log('- 商品数:', orderResult.value.items.length);

// 注文の確定
const placedResult = placeOrder(orderResult.value, 'payment-456');
if (!placedResult.success) {
  console.error('注文確定エラー:', placedResult.error);
  process.exit(1);
}

console.log('\n注文が確定されました:');
console.log('- ステータス:', placedResult.value.status.type);
console.log('- 決済ID:', (placedResult.value.status as any).paymentId);

console.log('\nサンプル実行完了');
