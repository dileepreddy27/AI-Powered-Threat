const axios = require("axios");
const { config } = require("../config");

const mlClient = axios.create({
  baseURL: config.mlApiUrl,
  timeout: 15000,
});

async function detectThreats(events, modelName) {
  const payload = {
    events,
    model_name: modelName || null,
  };
  const response = await mlClient.post("/detect", payload);
  return response.data;
}

async function getModels() {
  const response = await mlClient.get("/models");
  return response.data;
}

async function trainModels(events, modelNames) {
  const response = await mlClient.post("/train", {
    events: events || null,
    model_names: modelNames || null,
  });
  return response.data;
}

module.exports = {
  detectThreats,
  getModels,
  trainModels,
};
