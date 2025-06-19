const axios = require("axios");
require("dotenv").config();

const createTest = async (classId, sectionId, title) => {
  try {
    const url = `${process.env.WISE_API_HOST}/teacher/classes/${classId}/proxy/addTest`;

    const payload = {
      name: title,
      type: "UserInputOmrTest",
      sectionId: sectionId,
    };

    const response = await axios.post(url, payload, {
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

    const testData = response.data?.data?.data;

    if (!testData || !testData._id) {
      console.error("❌ Test creation failed. No test ID received.");
      console.error("🪵 Full Response:", response.data);
      return null;
    }

    const testId =
      typeof testData._id === "object" && testData._id.$oid
        ? testData._id.$oid
        : String(testData._id);

    // Build testSettings payload from testData (adjust fields as needed)
    const testSettings = {
      test_type: testData.type || "UserInputOmrTest",
      test: {
        name: testData.name,
        description: testData.description || "",
        max_marks: testData.max_marks || 0,
        duration: testData.duration || 0,
        mock_test: testData.mock_test ?? false,
        question_count: testData.question_count || 0,
        marking_schemes: testData.marking_schemes || {},
      },
    };

    return { testId, testSettings };
  } catch (error) {
    console.error("❌ Test creation failed.");
    console.error("🔴 Status:", error.response?.status);
    console.error("🪵 Error Data:", error.response?.data || error.message);
    return null;
  }
};

module.exports = createTest;