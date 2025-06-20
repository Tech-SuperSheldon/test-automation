const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates structured MCQs from a given transcript.
 * @param {string} transcript - Plain text of the transcript.
 * @param {number} numQuestions - Number of questions to generate.
 * @returns {Array|null} - Array of questions or null on failure.
 */
async function generateMCQs(transcript, numQuestions = 20) {
  const prompt = `
You are an expert teacher. Based on the transcript below and make sure to consider only subject related information don't consider general conversation, generate exactly ${numQuestions} questions with varying formats:

- MCQ_SINGLE_CORRECT (with 4 options and one correct answer),
- MCQ_MULTIPLE_CORRECT (with 4 options and multiple correct answers),
- INTEGER_ANSWER (numerical),
- FILL_IN_THE_BLANK (1 or 2 words only).

Strictly return a JSON array in this format:
[
  {
    "text": "Question 1",
    "options": { "a": "Red", "b": "Blue", "c": "Green", "d": "Black" },
    "answer": "b",
    "question_type": "MCQ_SINGLE_CORRECT"
  },
  {
    "text": "Question 2",
    "options": { "a": "Red", "b": "Blue", "c": "Green", "d": "Black" },
    "answer": "b,c",
    "question_type": "MCQ_MULTIPLE_CORRECT"
  },
  {
    "text": "Question 3",
    "answer": "4",
    "question_type": "INTEGER_ANSWER"
  },
  {
    "text": "Question 4",
    "answer": "new, old",
    "question_type": "FILL_IN_THE_BLANK"
  }
]

Transcript:
"""${transcript}"""
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // More deterministic
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from OpenAI");

    // Try parsing response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      console.warn("⚠️ Raw response not JSON, trying to extract JSON block...");
      const jsonStart = content.indexOf("[");
      const jsonEnd = content.lastIndexOf("]") + 1;
      const jsonLike = content.slice(jsonStart, jsonEnd);
      try {
        parsed = JSON.parse(jsonLike);
      } catch (e) {
        console.error("❌ Failed to parse OpenAI MCQ response:", e.message);
        return null;
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error("❌ OpenAI returned empty or invalid questions.");
      return null;
    }

    // ✅ Basic validation of structure
    const isValid = parsed.every((q) => q.text && q.question_type && q.answer);
    if (!isValid) {
      console.error("❌ One or more questions are missing required fields.");
      return null;
    }

    return parsed;
  } catch (err) {
    console.error("🔥 Error generating MCQs from transcript:", err.message);
    return null;
  }
}

module.exports = generateMCQs;
