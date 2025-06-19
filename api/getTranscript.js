const axios = require("axios");

async function parseTranscriptFromVTT(url) {
  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid or missing transcript URL.");
    }

    const response = await axios.get(url);
    const vttContent = response.data;

    if (!vttContent || typeof vttContent !== "string") {
      throw new Error("Empty or invalid VTT file content.");
    }

    const lines = vttContent.split("\n").filter((line) => {
      return (
        line.trim() !== "" &&
        !/^[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(line) && // timestamps
        !/^(WEBVTT|NOTE|align|position|line)/i.test(line) // metadata
      );
    });

    const transcript = lines.join(" ").replace(/\s+/g, " ").trim();

    if (!transcript || transcript.length < 30) {
      throw new Error("❌ Transcript is missing or too short.");
    }

    console.log("✅ Transcript extracted successfully.");
    return transcript;
  } catch (error) {
    console.error("🔥 Error parsing transcript:", error.message);
    throw error;
  }
}

module.exports = parseTranscriptFromVTT;
