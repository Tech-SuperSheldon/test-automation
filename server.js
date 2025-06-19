// const express = require("express");
// const bodyParser = require("body-parser");
// const fetch = require("node-fetch");
// require("dotenv").config();

// const getSessionDetails = require("./api/getSessionDetails");
// const getContentTimeline = require("./test/getContentTimeline");
// const createTest = require("./test/createTest");
// const addQuestions = require("./test/addQuestions");
// const updateTestSetting = require("./test/updateTestSettings");
// const generateMcqsFromTranscript = require("./api/generateMcqsFromTranscript");
// const publishTest = require("./test/publishTest");

// const app = express();
// app.use(bodyParser.json());

// // ✅ STEP 1: Manual Route for Testing
// app.post("/generate-test", async (req, res) => {
//   const { session_id } = req.body;

//   if (!session_id) {
//     return res.status(400).json({
//       error: true,
//       message: "❌ session_id is required in the request body.",
//     });
//   }

//   console.log("📥 Received session_id:", session_id);

//   try {
//     // STEP 2: Get Session Details
//     const sessionData = await getSessionDetails(session_id);
//     if (!sessionData) throw new Error("❌ Failed to fetch session data");

//     const { classId, title } = sessionData;
//     if (!classId || !title) throw new Error("❌ Missing classId or title");

//     console.log("✅ classId:", classId);
//     console.log("📝 Test Title:", title);

//     // STEP 3: Get Content Timeline
//     const timeline = await getContentTimeline(classId);
//     if (!Array.isArray(timeline) || timeline.length === 0) {
//       throw new Error("❌ No sections found in the content timeline");
//     }

//     const sectionId = timeline[0]._id;
//     console.log("📦 sectionId:", sectionId);

//     // STEP 4: Create Test
//     const testCreationResult = await createTest(classId, sectionId, title);
//     if (!testCreationResult || !testCreationResult.testId)
//       throw new Error("❌ Failed to create test");

//     const { testId, testSettings } = testCreationResult;
//     console.log("🧪 Test Created:", testId);

//     // STEP 5: Generate MCQs
//     const mcqData = await generateMcqsFromTranscript(session_id);
//     if (
//       !mcqData ||
//       !Array.isArray(mcqData.questions) ||
//       mcqData.questions.length === 0
//     ) {
//       throw new Error("❌ No valid MCQs generated");
//     }

//     const { questions } = mcqData;
//     console.log(`📚 Generated ${questions.length} questions`);

//     // STEP 6: Add Questions
//     const added = await addQuestions(testId, classId, questions);
//     if (!added) throw new Error("❌ Failed to add questions to the test");

//     console.log("✅ Questions added successfully");

//     // STEP 7: Update Test Settings
//     const settingsUpdated = await updateTestSetting(
//       testId,
//       classId,
//       testSettings,
//       questions.length
//     );

//     if (!settingsUpdated) throw new Error("❌ Failed to update test settings");
//     console.log("✅ Test settings updated successfully");

//     // STEP 8: Publish Test
//     const published = await publishTest(testId, classId);
//     if (!published) throw new Error("❌ Failed to publish the test");

//     console.log("📢 Test published successfully!");

//     return res.status(200).json({
//       success: true,
//       message:
//         "✅ Test created, questions added, settings updated and published successfully!",
//       testId,
//       questionCount: questions.length,
//     });
//   } catch (error) {
//     console.error("🔥 Error:", error.message || error);
//     return res.status(500).json({
//       error: true,
//       message: error.message || "Internal Server Error",
//     });
//   }
// });

// // ✅ STEP 2: Webhook Endpoint (Auto-trigger)
// app.post("/webhook/transcript-generated", async (req, res) => {
//   try {
//     const sessionId = req?.body?.payload?.sessionId;

//     if (!sessionId) {
//       console.error("❌ sessionId missing in webhook payload:", req.body);
//       return res.status(400).json({
//         error: true,
//         message: "❌ sessionId not found in webhook payload",
//       });
//     }

//     console.log("📡 Webhook Triggered | Session ID:", sessionId);

//     // Internally call /generate-test to reuse existing logic
//     const testResponse = await fetch("http://localhost:3000/generate-test", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ session_id: sessionId }),
//     });

//     const data = await testResponse.json();

//     if (!data.success) {
//       console.error("❌ Test generation failed via webhook:", data);
//       return res.status(500).json({
//         error: true,
//         message: "❌ Test generation failed via webhook",
//       });
//     }

//     console.log("✅ Test created via webhook:", data.testId);
//     return res.status(200).json({
//       success: true,
//       message: "✅ Test generated successfully via webhook",
//       testId: data.testId,
//       questionCount: data.questionCount,
//     });
//   } catch (err) {
//     console.error("🔥 Webhook error:", err.message);
//     return res.status(500).json({
//       error: true,
//       message: "Internal Server Error in webhook handler",
//     });
//   }
// });

// // ✅ Server Start
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server is running at http://localhost:${PORT}`);
// });


const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const getSessionDetails = require("./api/getSessionDetails");
const getContentTimeline = require("./test/getContentTimeline");
const createTest = require("./test/createTest");
const addQuestions = require("./test/addQuestions");
const updateTestSetting = require("./test/updateTestSettings");
const generateMcqsFromTranscript = require("./api/generateMcqsFromTranscript");
const publishTest = require("./test/publishTest");

const app = express();
app.use(bodyParser.json());

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
    // STEP 1: Get Session Details
    const sessionData = await getSessionDetails(session_id);
    if (!sessionData) throw new Error("❌ Failed to fetch session data");

    const { classId, title } = sessionData;
    if (!classId || !title) throw new Error("❌ Missing classId or title");

    console.log("✅ classId:", classId);
    console.log("📝 Test Title:", title);

    // STEP 2: Get Content Timeline
    const timeline = await getContentTimeline(classId);
    if (!Array.isArray(timeline) || timeline.length === 0) {
      throw new Error("❌ No sections found in the content timeline");
    }

    const sectionId = timeline[0]._id;
    console.log("📦 sectionId:", sectionId);

    // STEP 3: Create Test
    const testCreationResult = await createTest(classId, sectionId, title);
    if (!testCreationResult || !testCreationResult.testId)
      throw new Error("❌ Failed to create test");

    const { testId, testSettings } = testCreationResult;
    console.log("🧪 Test Created:", testId);

    // STEP 4: Generate MCQs
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

    // ✅ STEP 5: Add Questions to Test (FIXED: added classId as second param)
    const added = await addQuestions(testId, classId, questions);
    if (!added) throw new Error("❌ Failed to add questions to the test");

    console.log("✅ Questions added successfully");
    // STEP 6: Update Test Settings
    const totalQuestions = questions.length;
    const settingsUpdated = await updateTestSetting(
      testId,
      classId,
      testSettings,
      totalQuestions
    );

    if (!settingsUpdated) throw new Error("❌ Failed to update test settings");
    console.log("✅ Test settings updated successfully");

    // ✅ STEP 7: Publish the test
    const published = await publishTest(testId, classId);
    if (!published) {
      throw new Error("❌ Failed to publish the test");
    }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
