const axios = require("axios");
require("dotenv").config();

/**
 * Publishes a test on Wise with time settings.
 * @param {string} testId - ID of the test
 * @param {string} classId - Class ID
 */
async function publishTest(testId, classId) {
  const url = `${process.env.WISE_EXAM_API_HOST}/api/v1/teacher/tests/${testId}/activate`;


  const payload = {
    class_id: classId,
    user_id: process.env.WISE_USER_ID,
    current_role: "teacher",
    test_id: testId,
  };

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

    console.log("🚀 Test published successfully:", response.data);
    return true;
  } catch (error) {
    if (error.response) {
      console.error("❌ Failed to publish test:", error.response.data);
    } else {
      console.error(
        "🔥 Unexpected error while publishing test:",
        error.message
      );
    }
    return false;
  }
}

module.exports = publishTest;
