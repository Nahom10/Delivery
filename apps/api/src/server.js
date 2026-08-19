import { createApp } from './app.js';
import { config } from './config.js';
import { createDevelopmentRepository } from './repository.js';

const repository = createDevelopmentRepository({ bootstrapAdminTelegramId: config.bootstrapAdminTelegramId });
const app = createApp({ repository, config });
app.listen(config.port, () => console.log(`AllFreshMart API listening at http://localhost:${config.port}`));
