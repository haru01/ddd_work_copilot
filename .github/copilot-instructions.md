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
    ├── application/
    │   └── service.test.ts   # アプリケーション層テスト
    ├── domain/
    │   └── functions.test.ts # ドメイン関数テスト
    └── test-utils.ts        # テストユーティリティ
```

## 技術スタック

- **TypeScript** + **fp-ts** + **Zod** + **UUID** + **Vitest**
- 関数型プログラミング、ドメイン駆動設計、型安全性重視

## テスト状況

- **テストファイル**: 2ファイル
- **実行済みテスト**: 8 passed ✅
- **段階的開発用**: 7 skipped ⏭️
- **総テスト数**: 15テスト

## TDD開発フロー

1. **domainの types.ts** を実装 ✅
2. **function.create.test.ts** でテストを作成（1つだけ実行、他はskip） ✅
3. **function.create.ts** を実装してテストをパス ✅
4. **application層のテスト** を追加 ✅
5. skipテストを1つずつ有効化して機能を追加 ⏭️
6. 3回失敗したら一旦停止してナビゲーターに相談

## 現在のテスト状況

**総テスト数**: 15テスト（8 passed, 7 skipped）

### ドメイン層テスト (functions.test.ts)

- ✅ Order作成（正常系・バリデーション・境界値）
- ✅ 状態遷移（DRAFT→PLACED）
- ⏭️ キャンセル処理、配送状態（段階的実装）

### アプリケーション層テスト (service.test.ts)

- ✅ OrderService.createOrder（成功・失敗）
- ✅ OrderService.getOrdersByCustomer
- ⏭️ placeOrder, cancelOrder（未実装）

## 実装パターン

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
npm test                              # 全テスト実行 (8 passed, 7 skipped)
npm test -- --reporter=verbose       # 詳細なテスト結果表示
npm test tests/order/domain          # ドメイン層テストのみ
npm test tests/order/application     # アプリケーション層テストのみ
npm run example                      # サンプル実行
npm run type-check                   # 型チェック
npm run build                        # ビルド
```
