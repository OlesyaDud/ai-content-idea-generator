import React, { useState } from "react";
import OpenAI from "openai";

// ✅ Настройка клиента OpenAI
const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // ❗Только для тестов. В продакшене — вынести на сервер.
});

function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    niche: "Фитнес",
    goal: "Привлечь аудиторию",
    format: "Пост в соцсетях",
    postLength: "",
    platform: "",
  });
  const [ideas, setIdeas] = useState([]);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [generatedPost, setGeneratedPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ✅ Обработка изменений формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ✅ Копирование текста
  const copyToClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(generatedPost)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(fallbackCopy);
    } else fallbackCopy();
  };

  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedPost;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ✅ Генерация идей
  const generateIdeas = async () => {
    setLoading(true);
    setStep(2);

    try {
      const prompt = `
Ты — креативный AI, помогающий придумывать идеи для контента.

Ниша: ${form.niche}
Цель контента: ${form.goal}
Формат: ${form.format}
${
  form.format === "Пост в соцсетях"
    ? `Платформа: ${form.platform || "универсальная"}; Тип поста: ${
        form.postLength || "средний"
      }`
    : ""
}

Сгенерируй 5 оригинальных идей для контента, подходящих под эти параметры.
Для каждой идеи:
1️⃣ Придумай короткое и запоминающееся название (до 10 слов).
2️⃣ Напиши краткое описание (1–2 предложения, объясни, чем идея интересна и полезна аудитории).

⚠️ Важно:
- Генерируй только текстовые идеи.
- Не создавай видео или изображения.
- Если формат не подходит, адаптируй его под текстовый вариант.

Формат вывода:
1. Название — описание
2. ...
`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0].message.content;
      const parsed = text
        .split(/\d+\.\s/)
        .filter((x) => x.trim())
        .map((t) => {
          const [title, ...desc] = t.split("—");
          return {
            title: title?.trim() || "",
            desc: desc.join("—").trim(),
          };
        });

      setIdeas(parsed);
    } catch (err) {
      console.error(err);
      alert("Ошибка при обращении к OpenAI. Проверь API ключ.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Генерация контента
  const generatePost = async (idea) => {
    setLoading(true);
    setStep(3);
    setSelectedIdea(idea);

    try {
      const isSocial = form.format === "Пост в соцсетях";

      const prompt = `
Ты — профессиональный русскоязычный копирайтер и автор контента.

🎯 Задача:
Создать ${form.format.toLowerCase()} на тему:
"${idea.title}" — ${idea.desc}

📚 Контекст:
- Ниша: ${form.niche}
- Цель: ${form.goal}
${
  isSocial
    ? `- Платформа: ${form.platform}\n- Тип поста: ${form.postLength}`
    : ""
}

🧠 Правила:
- Пиши естественно, вдохновляюще, без шаблонов.
- Не используй слова "Введение", "Основная часть", "Заключение".
- Не используй Markdown-разметку (#, ** и т. д.).
- Структурируй логично, с плавными переходами.
${
  isSocial
    ? `
📱 Дополнительные правила для постов в соцсетях:
- ${
        form.postLength === "Короткий"
          ? "До 700 символов."
          : form.postLength === "Длинный"
          ? "До 1500 символов."
          : "Около 1000 символов."
      }
- Начало должно захватывать внимание.
- Стиль зависит от платформы:
  • LinkedIn — профессиональный, с ценными инсайтами.
  • Instagram — эмоциональный, вдохновляющий, с личными нотами.
  • Telegram — дружеский, искренний, неформальный.
- Заверши лёгким призывом к действию (вопрос, комментарий, сохранение).
`
    : ""
}

Формат вывода:
Только чистый текст без разметки.
`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Ты дружелюбный и опытный автор, создающий живые и интересные тексты на русском языке.",
          },
          { role: "user", content: prompt },
        ],
      });

      const cleanText = completion.choices[0].message.content
        .replace(/\*\*/g, "")
        .replace(/#+\s*/g, "")
        .trim();

      setGeneratedPost(cleanText);
    } catch (err) {
      console.error(err);
      alert("Ошибка при генерации текста.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Интерфейс
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-purple-500">
          AI Контент-Генератор идей
        </h1>
        <p className="text-gray-500 mt-3 text-lg">
          Сгенерируй идеи и тексты для своей ниши
        </p>
      </header>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Введите параметры для генерации идей
          </h2>

          {/* Ниша */}
          <div className="mb-5">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Ниша
            </label>
            <select
              name="niche"
              value={form.niche}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-purple-200"
            >
              <option>Фитнес</option>
              <option>Образование</option>
              <option>Бизнес</option>
              <option>Маркетинг</option>
              <option>Психология</option>
            </select>
          </div>

          {/* Цель контента */}
          <div className="mb-5">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Цель контента
            </label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-purple-200"
            >
              <option>Привлечь аудиторию</option>
              <option>Обучить</option>
              <option>Продать</option>
              <option>Мотивировать</option>
              <option>Удержать интерес</option>
            </select>
          </div>

          {/* Формат */}
          <div className="mb-5">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Формат
            </label>
            <select
              name="format"
              value={form.format}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-purple-200"
            >
              <option>Пост в соцсетях</option>
              <option>Статья</option>
              <option>Сценарий видео</option>
            </select>
          </div>

          {/* Дополнительные поля для поста */}
          {form.format === "Пост в соцсетях" && (
            <>
              <div className="mb-5">
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Тип поста
                </label>
                <select
                  name="postLength"
                  value={form.postLength}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">Выберите...</option>
                  <option>Короткий</option>
                  <option>Средний</option>
                  <option>Длинный</option>
                </select>
              </div>

              <div className="mb-5">
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Платформа
                </label>
                <select
                  name="platform"
                  value={form.platform}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">Выберите...</option>
                  <option>LinkedIn</option>
                  <option>Instagram</option>
                  <option>Telegram</option>
                </select>
              </div>
            </>
          )}

          <button
            onClick={generateIdeas}
            disabled={loading}
            className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold text-base mt-8 hover:bg-purple-600 transition disabled:opacity-60"
          >
            {loading ? "Генерация..." : "Сгенерировать идеи"}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Идеи для контента
            </h2>
            <button
              onClick={() => setStep(1)}
              className="text-base text-purple-500 hover:underline font-medium"
            >
              Изменить параметры
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-500">Генерация идей...</p>
          ) : (
            <div className="space-y-6">
              {ideas.map((idea, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl shadow-sm p-8 hover:shadow-md transition"
                >
                  <h3 className="font-bold text-2xl text-gray-900 mb-3">
                    {idea.title}
                  </h3>
                  <p className="text-gray-500 mb-6 text-base leading-relaxed">
                    {idea.desc}
                  </p>
                  <button
                    onClick={() => generatePost(idea)}
                    className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600 transition text-base"
                  >
                    Выбрать идею
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-10">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
            Сгенерированный текст
          </h2>

          {loading ? (
            <p className="text-center text-gray-500 text-lg">
              Генерация текста...
            </p>
          ) : (
            <>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4">
                <p className="whitespace-pre-line text-gray-800 leading-relaxed text-base">
                  {generatedPost}
                </p>
              </div>

              {/* Счётчик символов для соцсетей */}
              {form.format === "Пост в соцсетях" && (
                <p className="text-right text-sm text-gray-400 mb-6">
                  {generatedPost.length} /{" "}
                  {form.postLength === "Короткий"
                    ? "700"
                    : form.postLength === "Длинный"
                    ? "1500"
                    : "1000"}{" "}
                  символов
                </p>
              )}

              <div className="flex justify-between flex-wrap gap-4">
                <button
                  onClick={copyToClipboard}
                  className="bg-purple-500 text-white py-3 px-6 rounded-xl hover:bg-purple-600 transition font-semibold text-base"
                >
                  {copied ? "✓ Скопировано!" : "Скопировать текст"}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="text-purple-500 hover:underline font-medium text-base"
                >
                  Назад к идеям
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="mt-16 text-gray-500 text-sm">
        Создано с ❤️ при помощи{" "}
        <span className="text-purple-500 font-medium">AI</span>
      </footer>
    </div>
  );
}

export default App;
