import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

import getSessionDetails from "./api/getSessionDetails.js";
import getContentTimeline from "./test/getContentTimeline.js";
import createTest from "./test/createTest.js";
import addQuestions from "./test/addQuestions.js";
import updateTestSetting from "./test/updateTestSettings.js";
import generateMcqsFromTranscript from "./api/generateMcqsFromTranscript.js";
import publishTest from "./test/publishTest.js";

const app = express();
app.use(bodyParser.json());

// ✅ STEP 1: Manual Route for Testing
app.post("/generate-test", async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({
      error: true,
      message: "❌ session_id is required in the request body.",
    });
  }

  console.log("📥 Received session_id:", session_id);

  try {
    // STEP 2: Get Session Details
    const sessionData = await getSessionDetails(session_id);
    if (!sessionData) throw new Error("❌ Failed to fetch session data");

    const { classId, title } = sessionData;
    if (!classId || !title) throw new Error("❌ Missing classId or title");

    console.log("✅ classId:", classId);
    console.log("📝 Test Title:", title);

    // STEP 3: Get Content Timeline
    const timeline = await getContentTimeline(classId);
    if (!Array.isArray(timeline) || timeline.length === 0) {
      throw new Error("❌ No sections found in the content timeline");
    }

    const sectionId = timeline[0]._id;
    console.log("📦 sectionId:", sectionId);

    // STEP 4: Create Test
    const testCreationResult = await createTest(classId, sectionId, title);
    if (!testCreationResult || !testCreationResult.testId)
      throw new Error("❌ Failed to create test");

    const { testId, testSettings } = testCreationResult;
    console.log("🧪 Test Created:", testId);

    // STEP 5: Generate MCQs
    const mcqData = await generateMcqsFromTranscript(session_id);
    if (
      !mcqData ||
      !Array.isArray(mcqData.questions) ||
      mcqData.questions.length === 0
    ) {
      throw new Error("❌ No valid MCQs generated");
    }

    const { questions } = mcqData;
    console.log(`📚 Generated ${questions.length} questions`);

    // STEP 6: Add Questions
    const added = await addQuestions(testId, classId, questions);
    if (!added) throw new Error("❌ Failed to add questions to the test");

    console.log("✅ Questions added successfully");

    // STEP 7: Update Test Settings
    const settingsUpdated = await updateTestSetting(
      testId,
      classId,
      testSettings,
      questions.length
    );

    if (!settingsUpdated) throw new Error("❌ Failed to update test settings");
    console.log("✅ Test settings updated successfully");

    // STEP 8: Publish Test
    const published = await publishTest(testId, classId);
    if (!published) throw new Error("❌ Failed to publish the test");

    console.log("📢 Test published successfully!");

    return res.status(200).json({
      success: true,
      message:
        "✅ Test created, questions added, settings updated and published successfully!",
      testId,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error("🔥 Error:", error.message || error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
});

// ✅ STEP 2: Webhook Endpoint (Auto-trigger)
app.post("/webhook/transcript-generated", async (req, res) => {
  try {
    console.log(
      "📡 Webhook received with payload:",
      JSON.stringify(req.body, null, 2)
    );

    // Extract sessionId from the payload
    const sessionId = req.body?.payload?.sessionId;

    if (!sessionId) {
      console.error(
        "❌ sessionId missing in webhook payload. Full payload:",
        JSON.stringify(req.body, null, 2)
      );
      return res.status(400).json({
        error: true,
        message: "❌ sessionId not found in webhook payload",
      });
    }

    console.log("✅ Extracted sessionId:", sessionId);

    // Get the base URL from the request
    const baseUrl =
      process.env.BASE_URL ||
      "https://supersheldon-test-automation.onrender.com";
    const generateTestUrl = `${baseUrl}/generate-test`;

    console.log(
      "🔄 Making request to generate-test endpoint:",
      generateTestUrl
    );
    // Important: We need to use session_id here to match the generate-test endpoint's expected format
    const requestPayload = { session_id: sessionId };
    console.log("📤 Request payload:", requestPayload);

    // Internally call /generate-test to reuse existing logic
    const testResponse = await fetch(generateTestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    console.log("📥 Response status:", testResponse.status);
    const data = await testResponse.json();
    console.log("📥 Response data:", JSON.stringify(data, null, 2));

    if (!data.success) {
      console.error(
        "❌ Test generation failed via webhook. Response:",
        JSON.stringify(data, null, 2)
      );
      return res.status(500).json({
        error: true,
        message: `❌ Test generation failed via webhook: ${
          data.message || "Unknown error"
        }`,
        details: data,
      });
    }

    console.log("✅ Test created via webhook:", data.testId);
    return res.status(200).json({
      success: true,
      message: "✅ Test generated successfully via webhook",
      testId: data.testId,
      questionCount: data.questionCount,
    });
  } catch (err) {
    console.error("🔥 Webhook error:", err.message, "\nStack:", err.stack);
    return res.status(500).json({
      error: true,
      message: `Internal Server Error in webhook handler: ${err.message}`,
    });
  }
});

// ✅ Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
