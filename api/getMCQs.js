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
 * Claude 3 Haiku request using structured, grade-aware prompt
 */
async function callClaudeHaiku(transcript, numQuestions, locationContext) {
  const {
    city = "Unknown",
    state = "Unknown",
    country = "Unknown",
    grade = "8", // fallback
  } = locationContext;

  const prompt = `
You are an expert, student-centered teacher designing *assessment questions* for a student from ${city}, ${state}, ${country}. Your goal is to generate **exactly ${numQuestions} questions** using ONLY the provided transcript, ignoring general conversation and non-instructional content.

*Instructions:*

1. *Analyze the transcript* to extract grade-appropriate facts, concepts, and reasoning steps.
2. *Tweak the difficulty and vocabulary* of each question.
   * Use simple, concrete language and direct recall for lower grades.
   * Use more complex, analytical, or open-ended questions for higher grades.
3. *Vary the question formats* (use each type at least once if possible):
   * MCQ_SINGLE_CORRECT (4 options, 1 correct)
   * MCQ_MULTIPLE_CORRECT (4 options, multiple correct, comma-separated answers)
   * INTEGER_ANSWER (numerical)
   * FILL_IN_THE_BLANK (answer is 1–2 words)
4. *Incorporate examples, references, or context specific to the student's region* (${city}, ${state}, ${country}) when relevant.
5. Strictly output a valid *JSON array* as specified below—no explanations or extraneous text.

*JSON Output Example:*
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

*Transcript:*

text
${transcript}
`;

  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://supersheldon.wise.live", // mandatory
    "X-Title": "SuperSheldon Test Generator",
  };

  const body = {
    model: "anthropic/claude-3-haiku",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    top_p: 0.9,
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
  } catch {
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

    return finalQuestions.slice(0, numQuestions);
  } catch (err) {
    console.error("🔥 Error generating MCQs from Claude:", err.message);
    return null;
  }
}

export default generateMCQs;
