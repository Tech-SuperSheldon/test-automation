const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const addQuestionsToTest = async (testId, classId, questions) => {
  const url = `${process.env.WISE_EXAM_API_HOST}/api/v1/teacher/tests/${testId}/questions`;

  // ✅ Check if questions is valid
  if (!questions || !Array.isArray(questions)) {
    console.error("❌ Invalid 'questions' input:", questions);
    throw new Error("❌ 'questions' must be a valid array");
  }

  // ✅ Format questions safely
  const formattedQuestions = questions.map((q, i) => {
    const base = {
      text: q.text || `Untitled Question ${i + 1}`,
      answer: q.answer,
      question_type: q.question_type,
    };

    if (
      q.question_type === "MCQ_SINGLE_CORRECT" ||
      q.question_type === "MCQ_MULTIPLE_CORRECT"
    ) {
      if (!q.options || typeof q.options !== "object") {
        console.warn(`⚠️ Missing or invalid options in MCQ at index ${i}`);
        base.options = {};
      } else {
        base.options = q.options;
      }
    }

    return base;
  });

  try {
    const response = await axios.post(
      url,
      {
        class_id: classId,
        current_role: "teacher",
        questions: formattedQuestions,
      },
      {
        headers: {
          "user-agent": process.env.WISE_USER_AGENT,
          "x-api-key": process.env.WISE_API_KEY,
          "x-wise-namespace": process.env.WISE_NAMESPACE,
          Authorization: `Basic ${Buffer.from(
            `${process.env.WISE_USER_ID}:${process.env.WISE_API_KEY}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Questions added to test:", response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        "🔥 Axios error while adding questions:",
        error.response.data
      );
    } else {
      console.error("🔥 Unexpected error:", error.message);
    }
    throw new Error("❌ Failed to add questions to the test");
  }
};

module.exports = addQuestionsToTest;
