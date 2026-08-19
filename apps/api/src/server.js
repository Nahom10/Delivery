import { createApp } from './app.js';
import { config } from './config.js';
import { createDevelopmentRepository } from './repository.js';
import { createDeliveryService } from './delivery-service.js';

const repository = createDevelopmentRepository({ bootstrapAdminTelegramId: config.bootstrapAdminTelegramId });
const app = createApp({ repository, config, deliveryService: createDeliveryService({ openRouteServiceKey: config.openRouteServiceKey }) });
app.listen(config.port, () => console.log(`AllFreshMart API listening at http://localhost:${config.port}`));
