# TypeScript関数型DDD実践ガイド（コンパクト版）

## 必要な依存ライブラリ

### package.json

```json
{
  "name": "typescript-functional-ddd",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "type-check": "tsc --noEmit",
    "example": "tsx src/example.ts"
  },
  "dependencies": {
    "fp-ts": "^2.16.9",
    "zod": "^3.22.4",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "vitest": "^1.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### vite.config.ts（テスト設定）

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/']
    }
  }
});
```

## プロジェクト構造

```
src/
├── shared/types.ts           # 共通型
└── order/
    ├── domain/
    │   ├── types.ts          # ドメイン型（Zodスキーマ中心）
    │   └── functions.ts      # 純粋関数
    ├── application/
    │   └── service.ts        # TaskEitherサービス
    └── infrastructure/
        └── repository.ts     # インメモリ実装
```

## ストーリーをステップバイステップでを実装するためのTODO.mdの型 新規登録：新規作成の場合

* domainの types.ts を実装する
* domainの function.create.test.ts でテストを作成する。テストは１つだけ実行できるようにほかは skip にする
* domainの function.create.ts を実装する
* テストを実行してパスすることを確認する、修正する
* skip していた テストを1つだけ実行できるようにして、function.create.ts types.ts を修正する。
* skipがなくなるまで繰り返す
* ３回 Red になって、進展がなければ、一旦停止して、ナビゲーターの指示を受ける
* テストを実行してパスすることを確認する、修正する
* skip していた テストを1つだけ実行できるようにして、function.create.ts types.ts を修正する。
* skipがなくなるまで繰り返す
* 3回 テストに失敗したら 一旦停止して、ナビゲーターの指示を受ける

## 1. 基盤型定義

```typescript
// src/shared/types.ts
import { TaskEither } from 'fp-ts/TaskEither';

export type UUID = string & { readonly _brand: unique symbol };

export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export type AppError =
  | { type: 'ValidationError'; message: string }
  | { type: 'DomainError'; message: string };

export type AppTaskEither<T> = TaskEither<AppError, T>;

export const validationError = (message: string): AppError => ({
  type: 'ValidationError', message
});

export const domainError = (message: string): AppError => ({
  type: 'DomainError', message
});
```

## 2. ドメイン型定義（Zodスキーマ中心）

```typescript
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
```

## 3. ドメイン関数（純粋関数 + Zodバリデーション）

```typescript
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
```


```

## 5. インフラ実装

```typescript
// src/order/infrastructure/repository.ts
import { fromEither, right } from 'fp-ts/TaskEither';
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
```

## 6. テスト実装ガイド

### テスト実行戦略

#### TDDサイクル
1. **Red**: 失敗するテストを書く
2. **Green**: 最小限の実装でテストを通す
3. **Refactor**: コードを改善する


#### テストカバレッジの目標
- ドメイン関数: 100%
- アプリケーションサービス: 主要なパスをカバー
- エッジケースと境界値を必ずテスト

### テストユーティリティ

```typescript
// tests/order/test-utils.ts
import { OrderItem, Money, Order, CustomerId } from '../../src/order/domain/types';
import { createMoney, createOrder } from '../../src/order/domain/functions';

// デフォルトテストデータ
export const defaultOrderItems: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: createMoney(1000, 'JPY').value! }
];

// カスタムアサーション
export const expectValidationError = (
  items: OrderItem[],
  expectedError: string
) => {
  const result = createOrder('c1' as CustomerId, items);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toContain(expectedError);
  }
};

export const expectSuccess = (items: OrderItem[]) => {
  const result = createOrder('c1' as CustomerId, items);
  expect(result.success).toBe(true);
  return result;
};

// ビルダーパターン
export const orderBuilder = {
  withItems: (items: OrderItem[]) => ({ ...defaultOrder, items }),
  withStatus: (status: OrderStatus) => ({ ...defaultOrder, status }),
  build: () => defaultOrder
};
```

### ドメイン層テスト

```typescript
// tests/order/domain/functions.test.ts
import { describe, it, expect } from 'vitest';
import { createOrder, placeOrder, cancelOrder, createMoney } from '../../../src/order/domain/functions';
import { CustomerId, OrderItem, Order } from '../../../src/order/domain/types';
import { expectValidationError, expectSuccess } from '../test-utils';

describe('Order Domain Functions', () => {
  describe('createOrder', () => {
    describe('正常系', () => {
      it('有効な注文を作成できる', () => {
        const money = createMoney(1000, 'JPY');
        expect(money.success).toBe(true);

        if (money.success) {
          const items: OrderItem[] = [
            { productId: 'p1', quantity: 2, unitPrice: money.value }
          ];
          const result = createOrder('c1' as CustomerId, items);

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
          expectValidationError([], '商品が必要です');
        });

        it.skip('重複商品はエラー', () => {
          const money = createMoney(1000, 'JPY').value!;
          const items: OrderItem[] = [
            { productId: 'p1', quantity: 1, unitPrice: money },
            { productId: 'p1', quantity: 2, unitPrice: money }
          ];
          expectValidationError(items, '同じ商品を複数回追加');
        });

        it.skip('異なる通貨の混在はエラー', () => {
          const jpyMoney = createMoney(1000, 'JPY').value!;
          const usdMoney = createMoney(10, 'USD').value!;
          const items: OrderItem[] = [
            { productId: 'p1', quantity: 1, unitPrice: jpyMoney },
            { productId: 'p2', quantity: 1, unitPrice: usdMoney }
          ];
          expectValidationError(items, '同じ通貨である必要');
        });
      });
    });

    describe('境界値テスト', () => {
      it('商品数が上限10個まで登録できる', () => {
        const money = createMoney(1000, 'JPY').value!;
        const items: OrderItem[] = Array.from({ length: 10 }, (_, i) => ({
          productId: `p${i + 1}`,
          quantity: 1,
          unitPrice: money
        }));

        const result = expectSuccess(items);
        if (result.success) {
          expect(result.value.items).toHaveLength(10);
        }
      });

      it.skip('商品数が11個以上はエラー', () => {
        const money = createMoney(1000, 'JPY').value!;
        const items: OrderItem[] = Array.from({ length: 11 }, (_, i) => ({
          productId: `p${i + 1}`,
          quantity: 1,
          unitPrice: money
        }));

        expectValidationError(items, '商品は10個まで');
      });
    });
  });

  describe('状態遷移のテスト', () => {
    let draftOrder: Order;

    beforeEach(() => {
      const money = createMoney(1000, 'JPY').value!;
      const items: OrderItem[] = [
        { productId: 'p1', quantity: 1, unitPrice: money }
      ];
      const result = createOrder('c1' as CustomerId, items);
      if (result.success) {
        draftOrder = result.value;
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
      expect(result.error).toContain('キャンセル不可');
    });
  });
});
```





## まとめ



## セットアップと実行手順

```bash
# 1. プロジェクト初期化
npm init -y
npm install fp-ts zod uuid
npm install -D @types/node @types/uuid typescript tsx vitest

# 2. TypeScript設定
npx tsc --init

# 3. テスト実行
npm test

# 4. サンプル実行
npm run example

# 5. 型チェック
npm run type-check

# 6. ビルド
npm run build
```


## 参考資料

### 📚 書籍

**Domain-Driven Design**
- [Domain-Driven Design: Tackling Complexity in the Heart of Software](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215) - Eric Evans
- [Implementing Domain-Driven Design](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577) - Vaughn Vernon
- [Domain Modeling Made Functional](https://pragprog.com/titles/swdddf/domain-modeling-made-functional/) - Scott Wlaschin

**Functional Programming**
- [Functional Programming in Scala](https://www.manning.com/books/functional-programming-in-scala) - Paul Chiusano, Rúnar Bjarnason
- [Category Theory for Programmers](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/) - Bartosz Milewski
- [Professor Frisby's Mostly Adequate Guide to Functional Programming](https://mostly-adequate.gitbook.io/mostly-adequate-guide/) - Brian Lonsdorf

**TypeScript**
- [Programming TypeScript](https://www.oreilly.com/library/view/programming-typescript/9781492037644/) - Boris Cherny
- [Effective TypeScript](https://effectivetypescript.com/) - Dan Vanderkam

### 🌐 Web Resources

**Official Documentation**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [fp-ts Documentation](https://gcanti.github.io/fp-ts/)
- [fp-ts Learning Resources](https://github.com/gcanti/fp-ts/blob/master/docs/learning-resources.md)

**Functional Programming**
- [Functional Programming Jargon](https://github.com/hemanth/functional-programming-jargon)
- [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land)
- [Functional Programming Principles](https://www.cs.kent.ac.uk/people/staff/dat/miranda/whyfp90.pdf)
- [Algebraic Data Types](https://codewords.recurse.com/issues/three/algebra-and-calculus-of-algebraic-data-types)
- [Making Illegal States Unrepresentable](https://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/)

**Domain-Driven Design**
- [Domain-Driven Design Community](https://www.domainlanguage.com/)
- [DDD Reference](https://domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)

**Type-Driven Development**
- [Type-Driven Development](https://blog.ploeh.dk/2015/08/10/type-driven-development/)
- [Parse, Don't Validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
- [Branded Types in TypeScript](https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/)
- [Phantom Types](https://kccqzy.gitbooks.io/typescript-handbook-zh/content/advanced-types/phantom-types.html)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)

**Monads and Functional Patterns**
- [You Could Have Invented Monads](http://blog.sigfpe.com/2006/08/you-could-have-invented-monads-and.html)
- [Functors, Applicatives, And Monads In Pictures](https://adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)
- [Understanding TaskEither](https://dev.to/gcanti/getting-started-with-fp-ts-either-vs-validation-5eja)
- [Functional Error Handling](https://blog.logrocket.com/functional-error-handling-with-fp-ts/)

**TypeScript Advanced Patterns**
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)

### 🛠️ Libraries and Tools

**fp-ts Ecosystem**
- [fp-ts](https://github.com/gcanti/fp-ts) - Functional programming library
- [fp-ts-contrib](https://github.com/gcanti/fp-ts-contrib) - Additional utilities
- [io-ts](https://github.com/gcanti/io-ts) - Runtime type checking
- [monocle-ts](https://github.com/gcanti/monocle-ts) - Optics library

**Validation Libraries**
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- [Yup](https://github.com/jquense/yup) - Schema builder for value parsing
- [Joi](https://github.com/hapijs/joi) - Object schema description language

**Testing Tools**
- [Vitest](https://vitest.dev/) - Vite-native unit test framework
- [Jest](https://jestjs.io/) - JavaScript testing framework
- [fast-check](https://github.com/dubzzz/fast-check) - Property based testing

### 🎯 Example Repositories

**DDD Implementations**
- [DDD Sample](https://github.com/citerus/dddsample-core) - Classic DDD sample
- [Node.js DDD](https://github.com/stemmlerjs/ddd-forum) - TypeScript DDD implementation
- [Clean Architecture TypeScript](https://github.com/rmanguinho/clean-ts-api)

**Functional Programming Examples**
- [fp-ts Examples](https://github.com/gcanti/fp-ts/tree/master/examples)
- [Functional Domain Modeling](https://github.com/debasishg/frdomain)
- [Scala with Cats Examples](https://github.com/underscoreio/scala-with-cats-code)

**TypeScript Patterns**
- [TypeScript Patterns](https://github.com/torokmark/design_patterns_in_typescript)
- [Clean Code TypeScript](https://github.com/labs42io/clean-code-typescript)
- [TypeScript Style Guide](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)

### 📺 Video Resources

**Conference Talks**
- [Domain Modeling Made Functional - Scott Wlaschin](https://www.youtube.com/watch?v=Up7LcbGZFuo)
- [Railway Oriented Programming - Scott Wlaschin](https://www.youtube.com/watch?v=fYo3LN9Vf_M)
- [Functional architecture - The pits of success - Mark Seemann](https://www.youtube.com/watch?v=US8QG9I1XW0)
- [The Power of Composition - Scott Wlaschin](https://www.youtube.com/watch?v=WhEkBCWpDas)

**TypeScript Learning**
- [TypeScript Tutorial](https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUgr39Q_yD6v-bSyMwDPUI)
- [Advanced TypeScript](https://www.youtube.com/playlist?list=PLYvdvJlnTOjF6aJsWWAt7kZRJvzw-en8B)

### 🏆 Community and Forums

**Discussion Platforms**
- [Stack Overflow - TypeScript](https://stackoverflow.com/questions/tagged/typescript)
- [Reddit - Functional Programming](https://www.reddit.com/r/functionalprogramming/)
- [Reddit - Domain Driven Design](https://www.reddit.com/r/DomainDrivenDesign/)
- [TypeScript Community Discord](https://discord.gg/typescript)

**Blogs and Articles**
- [F# for Fun and Profit](https://fsharpforfunandprofit.com/)
- [Mark Seemann's Blog](https://blog.ploeh.dk/)
- [Bartosz Milewski's Programming Cafe](https://bartoszmilewski.com/)
- [Giulio Canti's Medium](https://medium.com/@gcanti)

### 🎓 Learning Path

**Beginner Path**
1. [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Core language features
2. [Zod Documentation](https://zod.dev/) - Schema validation
3. [Basic DDD Concepts](https://martinfowler.com/tags/domain%20driven%20design.html)

**Intermediate Path**
1. [fp-ts Documentation](https://gcanti.github.io/fp-ts/) - Functional programming
2. [TaskEither Guide](https://dev.to/gcanti/getting-started-with-fp-ts-either-vs-validation-5eja)
3. [Domain Modeling Made Functional](https://pragprog.com/titles/swdddf/domain-modeling-made-functional/)

**Advanced Path**
1. [Category Theory for Programmers](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/)
2. [Type-Level Programming](https://github.com/type-challenges/type-challenges)
3. [Advanced Architecture Patterns](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### 🛠️ ライブラリ解説

**fp-ts**
```typescript
// TaskEither: 非同期処理 + エラーハンドリング
import { TaskEither, chain, fromEither } from 'fp-ts/TaskEither';

// pipe: 関数合成
import { pipe } from 'fp-ts/function';

// Either: 同期的なエラーハンドリング
import { Either, left, right } from 'fp-ts/Either';
```

**Zod**
```typescript
// スキーマ定義によるランタイム型安全性
import { z } from 'zod';

// discriminatedUnion: 代数的データ型
const StatusSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('DRAFT') }),
  z.object({ type: z.literal('PLACED') })
]);

// safeParse: 安全なパース
const result = schema.safeParse(data);
```

**UUID**
```typescript
// 一意識別子生成
import { v4 as uuidv4 } from 'uuid';

// ブランド型との組み合わせ
export type OrderId = string & { readonly _brand: unique symbol };
export const createOrderId = (): OrderId => uuidv4() as OrderId;
```

### 🔗 関連リポジトリ

**参考実装**
- [TypeScript DDD Sample](https://github.com/stemmlerjs/ddd-forum)
- [Functional Domain Modeling](https://github.com/debasishg/frdomain)
- [fp-ts Ecosystem](https://github.com/gcanti/fp-ts-ecosystem)

**学習リソース**
- [TypeScript Exercises](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
- [Zod Examples](https://github.com/colinhacks/zod#examples)
- [fp-ts Learning Resources](https://github.com/gcanti/fp-ts/blob/master/docs/learning-resources.md)

### 📖 学習パス

**初級者向け**
1. TypeScript基礎 → 型システムの理解
2. Zod基礎 → ランタイム型安全性の理解
3. 基本的なDDDパターン → Value Object、Entity

**中級者向け**
1. fp-ts基礎 → 関数型プログラミングの概念
2. TaskEither → 副作用管理
3. 代数的データ型 → 状態モデリング

**上級者向け**
1. 高階関数とモナド → 抽象化技法
2. 型レベルプログラミング → コンパイル時検証
3. アーキテクチャパターン → ヘキサゴナルアーキテクチャ

### 💡 実践Tips

**デバッグ時の確認ポイント**
```typescript
// 1. Zodエラーの詳細確認
const result = schema.safeParse(data);
if (!result.success) {
  console.log(result.error.format()); // 構造化エラー表示
}

// 2. TaskEitherの結果確認
const taskResult = await taskEither();
if (taskResult._tag === 'Left') {
  console.log('Error:', taskResult.left);
}

// 3. 型ガードの動作確認
if (isDraft(order.status)) {
  console.log('Draft order:', order.status.createdAt);
}
```

この実装により、TypeScript + Zod + fp-tsを使った関数型DDDの完全な学習環境が整います！🚀