# TypeScript関数型DDD実践プロジェクト

## 概要

このプロジェクトは、TypeScript、fp-ts、Zodを使用した関数型プログラミングとドメイン駆動設計（DDD）の実践サンプルです。

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

tests/
└── order/
    ├── test-utils.ts         # テストユーティリティ
    └── domain/
        └── functions.test.ts # ドメイン関数テスト
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. TypeScript コンパイル

```bash
npm run build
```

### 3. テスト実行

```bash
npm test
```

### 4. サンプル実行

```bash
npm run example
```

### 5. 型チェック

```bash
npm run type-check
```

## 使用技術

- **TypeScript**: 型安全性とコンパイル時チェック
- **fp-ts**: 関数型プログラミングライブラリ
- **Zod**: ランタイム型検証とスキーマ定義
- **UUID**: 一意識別子生成
- **Vitest**: 高速テスティングフレームワーク

## 実装している概念

### ドメイン駆動設計（DDD）
- Value Objects（金額、注文アイテム）
- Entity（注文）
- ドメインサービス
- 代数的データ型による状態管理

### 関数型プログラミング
- 純粋関数
- 不変性
- モナド（TaskEither）
- 関数合成

### 型安全性
- ブランド型によるID管理
- Zodによるランタイム検証
- 型ガードによる安全な状態遷移

## 次のステップ

1. 依存関係をインストールして、エラーを解決
2. テストを実行してTDDサイクルを体験
3. 新機能の追加（配送、返品など）
4. パフォーマンステストの追加

## 学習リソース

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [fp-ts Documentation](https://gcanti.github.io/fp-ts/)
- [Zod Documentation](https://zod.dev/)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
