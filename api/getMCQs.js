import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Core OpenAI prompt + response logic
 */
async function callOpenAI(transcript, numQuestions, locationContext) {
  const {
    city = "Unknown",
    state = "Unknown",
    country = "Unknown",
  } = locationContext;

  const prompt = `
You are an expert teacher creating questions for a student from ${city}, ${state}, ${country}. 
Based on the transcript below, and making sure to ignore general conversation, generate exactly ${numQuestions} questions with varying formats:

- MCQ_SINGLE_CORRECT (4 options, 1 correct),
- MCQ_MULTIPLE_CORRECT (4 options, multiple correct),
- INTEGER_ANSWER (numerical),
- FILL_IN_THE_BLANK (1–2 words only).

Use examples relevant to the student’s region when possible. Strictly return a valid JSON array like this:
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

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");

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
      const newQuestions = await callOpenAI(
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
    console.error("🔥 Error generating MCQs from transcript:", err.message);
    return null;
  }
}

export default generateMCQs;
