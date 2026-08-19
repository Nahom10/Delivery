import { createApp } from '../apps/api/src/app.js';
import { config } from '../apps/api/src/config.js';
import { createDeliveryService } from '../apps/api/src/delivery-service.js';
import { createDevelopmentRepository } from '../apps/api/src/repository.js';

// Vercel imports this module per serverless instance. Do not call app.listen() here.
const repository = createDevelopmentRepository({ bootstrapAdminTelegramId: config.bootstrapAdminTelegramId });
const app = createApp({
  repository,
  config,
  deliveryService: createDeliveryService({ openRouteServiceKey: config.openRouteServiceKey })
});

export default app;
