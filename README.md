# 4D SDF Playground

4D SDF Playground は、**4次元の Signed Distance Function (SDF) をブラウザ上で書いて、その形を 3D として眺めたり回したりできるプレイグラウンド**です。

「4次元の関数を少しずついじって、3次元に投影するとどう見えるか」を気軽に試すためのリポジトリです。  
アプリは完全にクライアントサイドで動作し、基本的には **GitHub Pages 上でそのまま遊ぶ**ことを想定しています。

## 公開ページ

- GitHub Pages: [https://83bite.github.io/4DSDF/](https://83bite.github.io/4DSDF/)
- Repository: [https://github.com/83bite/4DSDF](https://github.com/83bite/4DSDF)

まずは GitHub Pages を開くのがおすすめです。ローカル環境を用意しなくても、そのまま触れます。

## これは何ができる？

- 4次元 SDF を GUI 上で直接編集できる
- いくつかの example を読み込んで、その場で改造できる
- `w` 方向への **Projection** と、特定の `w` で切る **Slice** を切り替えられる
- 4D 回転（`XW`, `YW`, `ZW`, `XY`, `XZ`, `YZ`）をスライダーで調整できる
- 出てきた 3D 形状をマウス操作で回転・拡大して観察できる

## 使い方

### 1. まず example を読み込む

左上の `Example` からサンプルを選び、`Load Example` を押します。

最初は次の example が触りやすいです。

- `Tesseract`
- `Hypersphere`
- `Smooth Blend`

### 2. 表示モードを選ぶ

- `Projection`
  - 4D 形状を `w` 軸方向に見込んで、3D に落とした見え方です
- `Slice`
  - `w = 定数` で切った 3D 断面です

4次元っぽい変化を見たいなら `Projection`、断面の変化を追いたいなら `Slice` がわかりやすいです。

### 3. 関数を編集する

`Function Body` に **JavaScript の関数本体**を書きます。  
1つの数値を `return` してください。

```js
return sdSphere4([x, y, z, w], 0.95);
```

返り値の意味は普通の SDF と同じです。

- `0` 未満: 内側
- `0` 付近: 表面
- `0` より大きい: 外側

編集後は `Apply Code` を押すと再計算されます。

### 4. スライダーで形を調整する

- `XW`, `YW`, `ZW`, `XY`, `XZ`, `YZ`
  - 4D / 3D の回転角です
- `Grid Resolution`
  - 形状サンプリングの細かさです。上げるほど重くなります
- `W Samples`
  - Projection 時に `w` 方向をどれだけ細かく見るかです
- `XYZ Bound`
  - 空間の観測範囲です
- `W Range`
  - `w` をどこまで見るかです
- `Slice W`
  - Slice モードでの断面位置です

### 5. ビューを操作する

- ドラッグ: 回転
- ホイール: ズーム
- `Spin Camera`: 自動回転のオン / オフ
- `Reset View`: カメラを初期位置に戻す
- `Reset Scene`: 現在の example の初期パラメータに戻す

## 関数の書き方

このアプリでは、数式エディタではなく **JavaScript で SDF を書く**形になっています。  
使える入力変数は次の4つです。

- `x`
- `y`
- `z`
- `w`

つまり、4次元空間上の1点 `(x, y, z, w)` に対して距離関数を返します。

### 最小の例

```js
return sdSphere4([x, y, z, w], 0.95);
```

### 変数を使う例

```js
const box = sdBox4([x, y, z, w], [0.62, 0.62, 0.62, 0.62]);
const sphere = sdSphere4([x, y, z, w], 0.95);
return smin(box, sphere, 0.22);
```

### 繰り返しを使う例

```js
const cell = [repeat(x, 0.92), repeat(y, 0.92), repeat(z, 0.92), repeat(w, 0.92)];
return sdSphere4(cell, 0.24);
```

## 使える主な helper

### Primitive

- `sdSphere4(point, radius)`
- `sdBox4(point, bounds)`
- `sdDuocylinder(point, radiusA, radiusB)`
- `sdCross4(point, armLength, thickness)`

### Blend / Boolean

- `smin(a, b, k)`
- `smax(a, b, k)`
- `opUnion(a, b)`
- `opIntersect(a, b)`
- `opSubtract(a, b)`

### Math / Utility

- `length2(x, y)`
- `length3(x, y, z)`
- `length4(point)`
- `repeat(value, spacing)`
- `mix(a, b, t)`
- `clamp(value, min, max)`
- `saturate(value)`
- `sin(x)`, `cos(x)`, `tan(x)`
- `abs(x)`, `min(a, b)`, `max(a, b)`, `pow(a, b)`, `sqrt(x)`
- `PI`, `TAU`

## example から始めるのがおすすめ

同梱 example は、単なる完成品ではなく「編集の出発点」として入っています。

- `Tesseract`
  - 4D の箱を触るための基本形
- `Hypersphere`
  - 4D 球の断面変化がわかりやすい
- `Duocylinder`
  - 4D らしい独特な投影が出やすい
- `Smooth Blend`
  - 複数形状の滑らかな合成例
- `Hyper Cross`
  - 軸方向の構造を見る用
- `Lattice Bloom`
  - `repeat` を使った反復構造の例
- `Ripple Shell`
  - 少し有機的な変形例

## ローカルで動かす

通常は GitHub Pages 版を使えば十分ですが、ローカルで動かしたい場合は HTTP サーバー経由で開いてください。

```powershell
npm run preview
```

その後、次を開きます。

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 開発者向けメモ

内部構成を見たい場合は次のように分かれています。

- `frontend/`
  - UI とキャンバス描画
- `backend/`
  - SDF 評価、4D サンプリング、3D メッシュ化
- `scripts/verify-backend.js`
  - example 群の簡易検証

バックエンドの簡易確認は次で実行できます。

```powershell
npm run verify:backend
```

## GitHub Pages への公開

このリポジトリには GitHub Pages 用 workflow が含まれています。

- workflow: `.github/workflows/deploy-pages.yml`

公開する場合は、GitHub 側で Pages を GitHub Actions から配信する設定にしてください。
