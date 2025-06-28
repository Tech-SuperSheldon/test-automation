import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/**
 * Removes duplicate questions based on text content
 */
function removeDuplicates(questions) {
  const seen = new Set();
  return questions.filter((q) => {
    const key = q.text.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Claude 3 Haiku prompt + response logic via OpenRouter
 */
async function callClaudeHaiku(transcript, numQuestions, locationContext) {
  const {
    city = "Unknown",
    state = "Unknown",
    country = "Unknown",
  } = locationContext;

  const prompt = `
You are an expert teacher creating exactly ${numQuestions} diverse exam-style questions for a student in ${city}, ${state}, ${country}.
Use ONLY subject-relevant content from the transcript.
Question formats must be:
- MCQ_SINGLE_CORRECT (4 options, 1 correct),
- MCQ_MULTIPLE_CORRECT (4 options, multiple correct),
- INTEGER_ANSWER (numerical),
- FILL_IN_THE_BLANK (1–2 words only).

Strictly return a JSON array like:
[
  {
    "text": "What is ...?",
    "options": { "a": "A", "b": "B", "c": "C", "d": "D" },
    "answer": "b",
    "question_type": "MCQ_SINGLE_CORRECT"
  }
]

Transcript:
"""${transcript}"""
`;

  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://supersheldon.wise.live",
    "X-Title": "Test Generator",
  };

  const body = {
    model: "anthropic/claude-3-haiku",
    messages: [{ role: "user", content: prompt }],
  };

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    body,
    { headers }
  );

  const content = response.data.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from Claude");

  try {
    return JSON.parse(content);
  } catch (jsonError) {
    const jsonStart = content.indexOf("[");
    const jsonEnd = content.lastIndexOf("]") + 1;
    const jsonLike = content.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonLike);
  }
}

/**
 * Ensures exactly `numQuestions` are returned, retrying if fewer are generated.
 */
async function generateMCQs(
  transcript,
  numQuestions = 20,
  locationContext = {}
) {
  let finalQuestions = [];

  try {
    while (finalQuestions.length < numQuestions) {
      const remaining = numQuestions - finalQuestions.length;
      const newQuestions = await callClaudeHaiku(
        transcript,
        remaining,
        locationContext
      );
      if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
        console.warn("⚠️ No new questions returned in retry.");
        break;
      }

      finalQuestions.push(...newQuestions);
      finalQuestions = removeDuplicates(finalQuestions);
    }

    // Trim to exactly numQuestions if exceeded
    if (finalQuestions.length > numQuestions) {
      finalQuestions = finalQuestions.slice(0, numQuestions);
    }

    const isValid = finalQuestions.every(
      (q) => q.text && q.answer && q.question_type
    );
    if (!isValid) {
      console.error("❌ One or more final questions missing required fields.");
      return null;
    }

    return finalQuestions;
  } catch (err) {
    console.error("🔥 Error generating MCQs from Claude:", err.message);
    return null;
  }
}

export default generateMCQs;
