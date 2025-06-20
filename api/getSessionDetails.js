import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const getSessionDetails = async (session_id) => {
  try {
    const url = `${process.env.WISE_API_HOST}/user/session/${session_id}`;

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
        showLiveClassInsight: true,
        showFeedbackConfig: true,
        showFeedbackSubmission: true,
        showSessionFiles: true,
        showAgendaStructure: true,
      },
    });

    const session = response.data?.data;
    if (!session) throw new Error("Session not found in response");

    const transcriptUrl = session.rawTranscript?.[0]?.url || null;

    return {
      sessionId: session._id,
      classId: session.classId,
      className: session.className,
      subject: session.classSubject,
      title: session.title || session.topic || "Untitled Test",
      date: session.start_time
        ? new Date(session.start_time).toLocaleString()
        : "Unknown Date",
      duration: session.duration
        ? Math.round(session.duration / 60000) + " min"
        : "Unknown Duration",
      transcriptUrl,
      summaryOverview: session.rawMeetingSummary?.[0]?.summaryOverview || null,
      teacherName: session.userId?.name || "Unknown",
    };
  } catch (error) {
    console.error(
      "❌ Error fetching session details:",
      error.response?.data || error.message
    );
    return null;
  }
};

export default getSessionDetails;
