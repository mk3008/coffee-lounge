# AGENTS: coffee-lounge

このファイルは「思想」ではなく「契約」である。
迷ったら DESIGN.md ではなく、まずこれを見る。

## 最優先ルール

1. MVP では「成立」を最優先する
2. 賢くしようとしない
3. 将来のために今を複雑にしない

## Phase 1 のスコープ

許可されていること:
- chat 機能の実装
- 会話の継続
- 長期記憶の永続化
- トークン消費を抑える設計

禁止されていること:
- 記憶の分類・タグ付け
- 知識マップ構築
- マルチユーザ前提の設計
- UI の作り込み
- センシティブ情報対策
- 上流工程オートマトン機能

## 工程と情報参照ルール

- 設計工程:
  - コードを深掘りしない
  - 成果物はドキュメントのみ

- 実装工程:
  - DESIGN と AGENTS に従う
  - 迷ったらスコープを削る

## 成果物ルール

- 次工程に渡す物だけを作る
- 実験コードは残さない
- 「あとで直す」は禁止

## 判断基準

次の問いに YES と答えられなければ、やらない。

- それは Phase 1 の成功条件に直接寄与するか？
- それがなくても会話は成立するか？

## Dogfooding

- dogfooding 中に依存ライブラリや開発フローの摩擦を見つけたら、まず downstream (`coffee-lounge`) 側で吸収できるかを検討する
- upstream に上げるのは、rawsql-ts の使い方・仕様・UX が原因の摩擦に限定する
- Dogfooding Notes には upstream-facing friction だけを残し、downstream mitigations は別セクションで短く扱う
- upstream 提案にする場合は、必ず以下をセットで残す
  - evidence（どこで詰まったか）
  - minimal reproduction（最小例）
  - proposed upstream change（Docs / Recipe / Tests / Helper のどれか）
- app 固有の設計改善（例: repo 層の分割、トランザクション制御の置き場所など）は upstream へ混ぜず downstream に留める
