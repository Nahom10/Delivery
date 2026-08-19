import app from '../../apps/api/src/handler.js';

// Express owns parsing, responses, and the Telegram webhook body in this endpoint.
export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 30
};

export default app;
