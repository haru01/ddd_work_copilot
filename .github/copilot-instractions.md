# TypeScript関数型DDD実践ガイド（コンパクト版）

## プロジェクト構造（現在の構成）

```text
src/
├── shared/types.ts           # 共通型定義（Result, AppError, TaskEither）
├── order/
│   ├── domain/
│   │   ├── types.ts          # ドメイン型（Zodスキーマ中心）
│   │   └── functions.ts      # 純粋関数（createOrder, placeOrder等）
│   ├── application/
│   │   └── service.ts        # TaskEitherサービス
│   └── infrastructure/
│       └── repository.ts     # InMemoryリポジトリ実装
└── example.ts               # サンプル実行ファイル

tests/
└── order/
    ├── domain/
    │   └── functions.test.ts # ドメイン関数テスト
    └── test-utils.ts        # テストユーティリティ
```

## 技術スタック

- **TypeScript** + **fp-ts** + **Zod** + **UUID** + **Vitest**
- 関数型プログラミング、ドメイン駆動設計、型安全性重視

## TDD開発フロー

1. **domainの types.ts** を実装
2. **function.create.test.ts** でテストを作成（1つだけ実行、他はskip）
3. **function.create.ts** を実装してテストをパス
4. skipテストを1つずつ有効化して機能を追加
5. 3回失敗したら一旦停止してナビゲーターに相談

## 実装パターン

### 共通型（src/shared/types.ts）

```typescript
export type Result<T> = 
  | { success: true; value: T }
  | { success: false; error: string };

export type AppError = 
  | { type: 'ValidationError'; message: string }
  | { type: 'DomainError'; message: string };

export type AppTaskEither<T> = TaskEither<AppError, T>;
```

### ドメイン型（Zodスキーマ中心）

```typescript
// ブランド型
export type OrderId = UUID & { readonly _orderBrand: unique symbol };

// Zodスキーマ
export const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1).max(10),
  status: OrderStatusSchema,
  totalAmount: MoneySchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// 型推論
export type Order = z.infer<typeof OrderSchema>;
```

### 純粋関数

```typescript
export const createOrder = (customerId: CustomerId, items: readonly OrderItem[]): Result<Order> => {
  // Zodバリデーション + ビジネスロジック
  const result = OrderSchema.safeParse(order);
  return result.success 
    ? { success: true, value: result.data }
    : { success: false, error: result.error.errors[0]?.message || 'Invalid order' };
};
```

### TaskEitherサービス

```typescript
export class OrderService {
  createOrder(customerId: CustomerId, items: readonly OrderItem[]): AppTaskEither<Order> {
    return pipe(
      fromEither(resultToEither(createOrder(customerId, items))),
      chain((order: Order) => this.repository.save(order))
    );
  }
}
```

## 実行コマンド

```bash
npm test           # テスト実行
npm run example    # サンプル実行
npm run type-check # 型チェック
npm run build      # ビルド
```
