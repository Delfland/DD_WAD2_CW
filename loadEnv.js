import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

let loaded = false;
const REQUIRED_ENV_VARS = ["ACCESS_TOKEN_SECRET"];

const validateRequiredEnvVars = (requiredVars = REQUIRED_ENV_VARS) => {
  const missingVars = requiredVars.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};

export const loadEnv = () => {
  if (loaded) {
    validateRequiredEnvVars();
    return process.env;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  dotenv.config({ path: path.join(__dirname, ".env") });
  validateRequiredEnvVars();
  loaded = true;

  return process.env;
};