import { GoogleGenerativeAI } from "@google/generative-ai";

// 注意: 本来はバックエンドで秘匿すべきですが、今回はデモ用にクライアントサイドで実装します。
// ユーザーが自分のAPIキーを設定できるようにUIを追加するのも一案です。

export async function generateMenu(inventory, schedule, apiKey, modelName = "gemini-2.5-flash", genreFilters = null, mealStyle = 'バランス', targetCalories = 2000) {
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const genreSection = genreFilters && (genreFilters.preferred.length > 0 || genreFilters.excluded.length > 0)
    ? `
【ジャンル設定】
${genreFilters.preferred.length > 0 ? `優先ジャンル: ${genreFilters.preferred.join('、')}` : ''}
${genreFilters.excluded.length > 0 ? `除外ジャンル: ${genreFilters.excluded.join('、')}` : ''}
`
    : '';

  const mealStyleInstructions = {
    'がっつり': 'ボリューム多め、満足感重視、カロリー高め（1食あたり700-900kcal程度）の献立を提案してください。',
    'ダイエット': '低カロリー（1食あたり300-500kcal程度）、野菜多め、脂質控えめのヘルシーな献立を提案してください。',
    '筋トレ': '高タンパク質（鶏肉、魚、卵、豆腐など）を中心に、筋肉増強をサポートする献立を提案してください。タンパク質30g以上を目安に。',
    'バランス': '栄養バランスを重視し、偏りのない健康的な献立を提案してください。',
    '時短': '調理時間15分以内、簡単な手順で作れる時短レシピを提案してください。',
    '節約': '安価な食材を中心に、コスパの良い献立を提案してください。'
  };

  const styleSection = mealStyleInstructions[mealStyle]
    ? `\n【食事スタイル】\n${mealStyleInstructions[mealStyle]}\n`
    : '';

  const prompt = `
你是優秀な料理研究家です。
以下の食材リストを使用して、指定されたスケジュールの献立を提案してください。

【目標設定】
1日の目標摂取カロリー: 約${targetCalories}kcal
※この目標カロリーに基づき、3食（朝・昼・夕）のカロリー配分を適切に調整してください。

食材リスト:
${inventory}

スケジュール (除外された日は提案不要):
${JSON.stringify(schedule, null, 2)}
${genreSection}${styleSection}
出力は以下のJSON形式のみで返してください。余計な解説は不要です。
{
  "results": {
    "月-朝食": {
      "name": "献立名",
      "calories": 350,
      "cookingTime": 15,
      "ingredients": [
        {"name": "鶏肉", "amount": 150, "unit": "g"}
      ],
      "steps": [
        "手順1の説明",
        "手順2の説明",
        "手順3の説明"
      ]
    },
    "月-昼食": {
      "name": "献立名",
      "calories": 650,
      "cookingTime": 30,
      "ingredients": [...],
      "steps": [...]
    }
  }
}

※ calories は1人分のカロリー（kcal）を整数で返してください。
※ cookingTime は調理時間（分）を整数で返してください。
※ ingredients は使用する食材と量を具体的に記載してください。
※ steps は調理手順を配列で、わかりやすく簡潔に記載してください。
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // JSON部分のみを抽出（バックティックなどを除去）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).results;
    }
    throw new Error("AIからの応答を解析できませんでした。");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
