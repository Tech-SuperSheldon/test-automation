import getSessionDetails from "./getSessionDetails.js";
import parseTranscriptFromVTT from "./getTranscript.js";
import generateMCQList from "./getMCQs.js";
import fetchStudentDetails from "./studentDetails.js";

const generateMCQs = async (session_id) => {
  try {
    // Step 1: Get session details
    const sessionData = await getSessionDetails(session_id);
    if (!sessionData) {
      throw new Error(
        "❌ Session data fetch failed - Check session ID and API credentials"
      );
    }

    const { transcriptUrl, classId, title, studentId } = sessionData;
    if (!studentId) {
      throw new Error("❌ No student ID found in session data");
    }

    if (!transcriptUrl || transcriptUrl.includes("No transcript")) {
      throw new Error("❌ No valid transcript URL found in session data");
    }

    // Step 2: Fetch student location details
    let locationContext;
    try {
      locationContext = await fetchStudentDetails(studentId);
      if (!locationContext) {
        console.warn(
          "⚠️ Could not fetch student location details, using default context"
        );
        locationContext = {
          city: "Unknown",
          state: "Unknown",
          country: "Unknown",
        };
      }
    } catch (locationError) {
      console.warn(
        "⚠️ Error fetching location details:",
        locationError.message
      );
      locationContext = {
        city: "Unknown",
        state: "Unknown",
        country: "Unknown",
      };
    }

    // Step 3: Parse transcript
    let transcript;
    try {
      transcript = await parseTranscriptFromVTT(transcriptUrl);
      if (!transcript || transcript.trim().length < 30) {
        throw new Error("❌ Transcript is too short or empty");
      }
    } catch (transcriptError) {
      throw new Error(
        `❌ Failed to parse transcript: ${transcriptError.message}`
      );
    }

    // Step 4: Generate MCQs
    const questions = await generateMCQList(transcript, 20, locationContext);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error(
        "❌ No questions generated or invalid format returned from OpenAI"
      );
    }

    // Step 5: Validate question structure
    const requiredFields = ["text", "answer", "question_type"];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const missingFields = requiredFields.filter((field) => !q[field]);
      if (missingFields.length > 0) {
        throw new Error(
          `❌ Question ${
            i + 1
          } is missing required fields: ${missingFields.join(", ")}`
        );
      }
    }

    console.log("✅ MCQs Generated Successfully");
    console.log(`📊 Generated ${questions.length} questions`);
    console.log(
      `📍 Using location context: ${locationContext.city}, ${locationContext.state}, ${locationContext.country}`
    );

    return { questions, classId, title };
  } catch (err) {
    console.error("🔥 Error in generateMCQs:", err.message);
    // Rethrow the error with additional context
    throw new Error(`Failed to generate MCQs: ${err.message}`);
  }
};

export default generateMCQs;
