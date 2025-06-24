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

    // Get the main user's ID and name
    const mainUserId = session.userId?._id;
    const mainUserName = session.userId?.name?.trim();

    // Get all participants
    const participants = session.participants || [];

    // Find participants whose names don't match the main user's name
    const nonMatchingParticipants = participants.filter((participant) => {
      const participantName = participant.name?.trim();
      return (
        participantName &&
        participantName.toLowerCase() !== mainUserName?.toLowerCase()
      );
    });

    // Get wiseUserIds from non-matching participants
    const studentId = nonMatchingParticipants
      .map((participant) => participant.wiseUserId)
      .filter((id) => id); // Filter out any undefined/null IDs

    return {
      studentId, // Array of wiseUserIds where name doesn't match
      mainUserId, // The main user's ID for reference
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
