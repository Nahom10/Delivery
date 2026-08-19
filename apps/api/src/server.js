import { config } from './config.js';
import app from './handler.js';

app.listen(config.port, () => console.log(`AllFreshMart API listening at http://localhost:${config.port}`));
