const dotenv = require("dotenv");

dotenv.config();

const config = {
  host: process.env.GATEWAY_HOST || "0.0.0.0",
  port: Number(process.env.GATEWAY_PORT || 4000),
  mlApiUrl: process.env.ML_API_URL || "http://localhost:8000",
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/threat_shield",
};

module.exports = { config };

