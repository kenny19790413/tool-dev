export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
}

// 初心者にわかりにくい専門用語の解説集。Termコンポーネントのツールチップと/glossaryページの両方から参照する。
export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: 'unrealized-gain',
    term: '含み損益',
    definition:
      'まだ売却していない資産を、今の価格で評価した場合の損益。プラスなら「含み益」、マイナスなら「含み損」と呼ぶ。実際に売却（実現）するまでは税金はかからない。',
  },
  {
    slug: 'dividend-yield',
    term: '配当・分配金',
    definition:
      '株式や投資信託を保有していることで定期的に受け取れるお金。「見込み」は予測値、「受取記録」は実際に入金された実績を表す。',
  },
  {
    slug: 'withholding-tax',
    term: '源泉徴収',
    definition:
      '配当・分配金が支払われる際に、あらかじめ税金分が差し引かれること。個人の場合は所得税15.315%＋住民税5%＝20.315%が天引きされ、原則それで納税が完結する。',
  },
  {
    slug: 'corporate-withholding',
    term: '法人の源泉徴収',
    definition:
      '法人が受け取る配当にも源泉徴収（15.315%、住民税分はなし）はあるが、これは「前払い」に過ぎず、最終的に法人税額から差し引かれる（控除される）仕組み。個人と違って源泉徴収だけで納税が完結しない点に注意。',
  },
  {
    slug: 'hhi',
    term: 'HHI（集中リスクスコア）',
    definition:
      'ハーフィンダール指数の略。保有資産や証券会社ごとの構成比（%）を2乗して合計した指標（0〜10000）。数値が大きいほど、一部の銘柄や証券会社に偏っている（分散されていない）ことを示す。目安は1500未満で「分散度良好」、2500以上で「集中度が高い」。',
  },
  {
    slug: 'tax-loss-harvesting',
    term: '損益通算',
    definition:
      '同じ年に発生した利益と損失を相殺して、課税対象となる利益を減らせる制度。個人の場合、含み損のある株式を実際に売却（実現）して初めて使える。相殺しきれない損失は確定申告により翌年以降3年間繰り越せる。',
  },
  {
    slug: 'avg-cost',
    term: '取得単価（平均取得単価）',
    definition:
      'その資産を購入したときの、1株（または1万口）あたりの平均購入価格。現在の価格との差から含み損益を計算する基準になる。',
  },
  {
    slug: 'nisa',
    term: 'NISA',
    definition:
      '個人が一定額まで、株式や投資信託の値上がり益・配当にかかる税金が非課税になる制度。このアプリの税額計算はNISA等の非課税枠を考慮せず概算で表示している。',
  },
  {
    slug: 'dividend-recovery',
    term: '配当による投資回収率',
    definition:
      'これまでに実際に受け取った配当・分配金の累計が、取得金額（取得単価×数量）の何%にあたるかを示す指標。100%に達すると、値上がり・値下がりを考えなくても配当だけで投資額を回収できたことになる。',
  },
  {
    slug: 'fx-gain',
    term: '為替差損益',
    definition:
      '外貨（主に米ドル）建ての資産で、購入した時と今とで為替レート（円換算のレート）が変わったことによる損益。株価そのものの値動きとは別の要因。',
  },
];

export function findGlossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.slug === slug);
}
