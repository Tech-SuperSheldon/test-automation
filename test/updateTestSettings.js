const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const updateTestSetting = async (testId, classId, testSettings, totalQuestions) => {
  const url = `${process.env.WISE_EXAM_API_HOST}/api/v2/teacher/tests/${testId}`;

  // ✅ Validate input
  if (!testSettings || typeof testSettings !== "object") {
    console.error("❌ Invalid 'testSettings' input:", testSettings);
    throw new Error("❌ 'testSettings' must be a valid object");
  }

  // ✅ Format payload
  const payload = {
    class_id: classId,
    user_id: process.env.WISE_USER_ID,
    current_role: "teacher",
    test_type: testSettings.test_type || "UserInputOmrTest",
    test: {
      name: testSettings.test?.name || "Untitled Test",
      description: testSettings.test?.description || "",
      max_marks: totalQuestions * 4,
      duration: totalQuestions * 3,
      mock_test: true,
      question_count: totalQuestions,
      marking_schemes: {
            "MCQ_SINGLE_CORRECT": {
                "correct_marks": 4,
                "incorrect_marks": 0
            },
            "MCQ_MULTIPLE_CORRECT": {
                "correct_marks": 4,
                "incorrect_marks": 0
            },
            "INTEGER_ANSWER": {
                "correct_marks": 4,
                "incorrect_marks": 0
            },
            "FILL_IN_THE_BLANK": {
                "correct_marks": 4,
                "incorrect_marks": 0
            }
        }
    }
  };

  // Debug logging
  console.log("PUT URL:", url);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.put(url, payload, {
      headers: {
        "user-agent": process.env.WISE_USER_AGENT,
        "x-api-key": process.env.WISE_API_KEY,
        "x-wise-namespace": process.env.WISE_NAMESPACE,
        Authorization: `Basic ${Buffer.from(
          `${process.env.WISE_USER_ID}:${process.env.WISE_API_KEY}`
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Test settings updated:", response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        "🔥 Axios error while updating test settings:",
        error.response.data
      );
    } else {
      console.error("🔥 Unexpected error:", error.message);
    }
    throw new Error("❌ Failed to update test settings");
  }
};

module.exports = updateTestSetting;
