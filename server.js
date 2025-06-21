import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

import getSessionDetails from "./api/getSessionDetails.js";
import getContentTimeline from "./test/getContentTimeline.js";
import createTest from "./test/createTest.js";
import addQuestions from "./test/addQuestions.js";
import updateTestSetting from "./test/updateTestSettings.js";
import generateMcqsFromTranscript from "./api/generateMcqsFromTranscript.js";
import publishTest from "./test/publishTest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const app = express();
app.use(bodyParser.json());

const processedSessions = new Set();

// ✅ STEP 1: Manual Route for Testing
app.post("/generate-test", async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({
      error: true,
      message: "❌ session_id is required in the request body.",
    });
  }

  if (processedSessions.has(session_id)) {
    console.log("⚠️ Test already generated for this session.");
    return res.status(200).json({
      success: true,
      message: "⚠️ Test already generated for this session_id",
    });
  }

  console.log("📥 Received session_id:", session_id);

  try {
    const sessionData = await getSessionDetails(session_id);
    if (!sessionData) throw new Error("❌ Failed to fetch session data");

    const { classId, title } = sessionData;
    if (!classId || !title) throw new Error("❌ Missing classId or title");

    console.log("✅ classId:", classId);
    console.log("📝 Test Title:", title);

    const timeline = await getContentTimeline(classId);
    if (!Array.isArray(timeline) || timeline.length === 0)
      throw new Error("❌ No sections found in the content timeline");

    const sectionId = timeline[0]._id;
    console.log("📦 sectionId:", sectionId);

    const testCreationResult = await createTest(classId, sectionId, title);
    if (!testCreationResult || !testCreationResult.testId)
      throw new Error("❌ Failed to create test");

    const { testId, testSettings } = testCreationResult;
    console.log("🧪 Test Created:", testId);

    const mcqData = await generateMcqsFromTranscript(session_id);
    if (
      !mcqData ||
      !Array.isArray(mcqData.questions) ||
      mcqData.questions.length === 0
    )
      throw new Error("❌ No valid MCQs generated");

    const { questions } = mcqData;
    console.log(`📚 Generated ${questions.length} questions`);

    const added = await addQuestions(testId, classId, questions);
    if (!added) throw new Error("❌ Failed to add questions to the test");
    console.log("✅ Questions added successfully");

    const settingsUpdated = await updateTestSetting(
      testId,
      classId,
      testSettings,
      questions.length
    );
    if (!settingsUpdated) throw new Error("❌ Failed to update test settings");
    console.log("✅ Test settings updated successfully");

    const published = await publishTest(testId, classId);
    if (!published) throw new Error("❌ Failed to publish the test");
    console.log("📢 Test published successfully!");

    processedSessions.add(session_id); // ✅ Mark session as processed

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

    const sessionId = req.body?.payload?.sessionId;

    if (!sessionId) {
      console.error("❌ sessionId missing in webhook payload.");
      return res.status(400).json({
        error: true,
        message: "❌ sessionId not found in webhook payload",
      });
    }

    if (processedSessions.has(sessionId)) {
      console.warn("⚠️ Duplicate webhook for session:", sessionId);
      return res.status(200).json({
        success: true,
        message: `⚠️ Test already generated for session: ${sessionId}`,
      });
    }

    console.log("✅ Extracted sessionId:", sessionId);

    const baseUrl =
      process.env.BASE_URL ||
      "https://supersheldon-test-automation.onrender.com";
    const generateTestUrl = `${baseUrl}/generate-test`;

    const requestPayload = { session_id: sessionId };
    console.log("📤 Sending to:", generateTestUrl);
    console.log("Payload:", requestPayload);

    const testResponse = await fetch(generateTestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await testResponse.json();
    console.log("📥 Response data:", data);

    if (!data.success) {
      console.error("❌ Test generation failed via webhook:", data);
      return res.status(500).json({
        error: true,
        message: `❌ Test generation failed: ${
          data.message || "Unknown error"
        }`,
      });
    }

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
      message: `Internal Server Error: ${err.message}`,
    });
  }
});

// ✅ Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
