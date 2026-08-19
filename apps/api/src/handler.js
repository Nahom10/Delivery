import { createApp } from './app.js';
import { config } from './config.js';
import { createDeliveryService } from './delivery-service.js';
import { createDevelopmentRepository } from './repository.js';

// Shared serverless/local Express instance. Never call listen() in this module.
const repository = createDevelopmentRepository({ bootstrapAdminTelegramId: config.bootstrapAdminTelegramId });
const app = createApp({
  repository,
  config,
  deliveryService: createDeliveryService({ openRouteServiceKey: config.openRouteServiceKey })
});

export default app;
