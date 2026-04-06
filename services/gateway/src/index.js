const cors = require("cors");
const express = require("express");
const multer = require("multer");

const { config } = require("./config");
const { pool } = require("./db/pool");
const { getModels, trainModels } = require("./services/mlClient");
const {
  ingestLogs,
  fetchEvents,
  fetchAlerts,
  acknowledgeAlert,
  fetchTimeline,
  fetchModelComparison,
} = require("./services/detectionService");
const { parseCsvBuffer } = require("./utils/csv");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ok", service: "gateway" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/models", async (_req, res) => {
  try {
    const response = await getModels();
    return res.status(200).json(response);
  } catch (error) {
    return res.status(502).json({ message: "Failed to reach ML API", error: error.message });
  }
});

app.post("/api/train", async (req, res) => {
  const { events, modelNames } = req.body || {};
  try {
    const response = await trainModels(events, modelNames);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(502).json({ message: "Failed to train models via ML API", error: error.message });
  }
});

app.post("/api/ingest", async (req, res) => {
  const { events, modelName } = req.body || {};
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ message: "events must be a non-empty array" });
  }

  try {
    const result = await ingestLogs(events, modelName);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to ingest logs", error: error.message });
  }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "file is required" });
  }

  try {
    const events = parseCsvBuffer(req.file.buffer);
    const result = await ingestLogs(events, req.body.modelName || null);
    return res.status(200).json({
      uploaded_rows: events.length,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to parse or process CSV", error: error.message });
  }
});

app.get("/api/events", async (req, res) => {
  const limit = Number(req.query.limit || 100);
  try {
    const events = await fetchEvents(limit);
    return res.status(200).json({ events });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
});

app.get("/api/alerts", async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const unackedOnly = String(req.query.unacked || "false").toLowerCase() === "true";
  try {
    const alerts = await fetchAlerts(limit, unackedOnly);
    return res.status(200).json({ alerts });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch alerts", error: error.message });
  }
});

app.post("/api/alerts/:id/ack", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid alert id" });
  }
  try {
    const updated = await acknowledgeAlert(id);
    if (!updated) {
      return res.status(404).json({ message: "alert not found" });
    }
    return res.status(200).json({ alert: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to acknowledge alert", error: error.message });
  }
});

app.get("/api/timeline", async (req, res) => {
  const hours = Number(req.query.hours || 24);
  try {
    const timeline = await fetchTimeline(hours);
    return res.status(200).json({ timeline });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch timeline", error: error.message });
  }
});

app.get("/api/model-comparison", async (req, res) => {
  const hours = Number(req.query.hours || 24);
  try {
    const models = await fetchModelComparison(hours);
    return res.status(200).json({ models });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch model comparison", error: error.message });
  }
});

app.listen(config.port, config.host, () => {
  // eslint-disable-next-line no-console
  console.log(`Gateway running on http://${config.host}:${config.port}`);
});
