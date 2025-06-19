const axios = require("axios");
require("dotenv").config();

const getContentTimeline = async (classId) => {
  try {
    const url = `${process.env.WISE_API_HOST}/user/classes/${classId}/contentTimeline`;

    const response = await axios.get(url, {
      headers: {
        "user-agent": process.env.WISE_USER_AGENT,
        "x-api-key": process.env.WISE_API_KEY,
        "x-wise-namespace": process.env.WISE_NAMESPACE,
        Authorization: `Basic ${Buffer.from(
          `${process.env.WISE_USER_ID}:${process.env.WISE_API_KEY}`
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      params: {
        showSequentialLearningDisabledSections: true,
      },
    });

    return response.data.data.timeline; // 👈 returns only the timeline array
  } catch (error) {
    console.error(
      "❌ Error fetching content timeline:",
      error.response?.data || error.message
    );
    return null;
  }
};

module.exports = getContentTimeline;
