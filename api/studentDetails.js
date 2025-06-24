import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const fetchStudentDetails = async (studentId) => {
  if (!studentId) {
    console.error("❌ Student ID is required");
    return null;
  }

  if (!process.env.WISE_API_HOST || !process.env.WISE_INSTITUTE_ID) {
    console.error("❌ Required environment variables are missing");
    return null;
  }

  const url = `${process.env.WISE_API_HOST}/public/institutes/${process.env.WISE_INSTITUTE_ID}/studentReports/${studentId}`;

  try {
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
    });

    if (!response.data?.data?.studentReport) {
      console.error("❌ Invalid response format");
      return null;
    }

    const fields =
      response.data.data.studentReport.registrationData?.fields || [];

    // Extract location values using specific questionIds
    const locationInfo = {
      city:
        fields.find((f) => f.questionId === "92d6lmyy")?.answer ||
        "Not Available",
      state:
        fields.find((f) => f.questionId === "mzldqxyr")?.answer ||
        "Not Available",
      country:
        fields.find((f) => f.questionId === "ju5cks6w")?.answer ||
        "Not Available",
    };

    // Log the extracted information
    console.log("📍 Location Info:");
    console.log("City:", locationInfo.city);
    console.log("State:", locationInfo.state);
    console.log("Country:", locationInfo.country);

    return locationInfo;
  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("❌ Server responded with error:", {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("❌ No response received from server");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("❌ Error setting up request:", error.message);
    }
    return null;
  }
};

export default fetchStudentDetails;
