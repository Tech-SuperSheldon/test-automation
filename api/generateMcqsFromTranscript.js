import getSessionDetails from "./getSessionDetails.js";
import parseTranscriptFromVTT from "./getTranscript.js";
import generateMCQList from "./getMCQs.js";

const generateMCQs = async (session_id) => {
  try {
    const sessionData = await getSessionDetails(session_id);
    if (!sessionData) throw new Error("❌ Session data fetch failed");

    const { transcriptUrl, classId, title } = sessionData;

    if (!transcriptUrl || transcriptUrl.includes("No transcript")) {
      throw new Error("❌ No valid transcript URL found.");
    }

    const transcript = await parseTranscriptFromVTT(transcriptUrl);
    if (!transcript || transcript.trim().length < 30) {
      throw new Error("❌ Transcript is too short or empty.");
    }

    const questions = await generateMCQList(transcript, 20);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("❌ No questions generated or invalid format.");
    }

    // Validate structure of each question
    const requiredFields = ["text", "answer", "question_type"];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      for (const field of requiredFields) {
        if (!q[field]) {
          throw new Error(`❌ Missing field '${field}' in question ${i + 1}`);
        }
      }
    }

    console.log("✅ MCQs Generated:", JSON.stringify(questions, null, 2));

    return { questions, classId, title };
  } catch (err) {
    console.error("🔥 Error in generateMCQs:", err.message);
    return null;
  }
};

export default generateMCQs;
