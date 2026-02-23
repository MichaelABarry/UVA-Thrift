import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

// Start the Express server on the specified port from environment variables. It logs a message to the console indicating that the server is running and on which URL it can be accessed.
app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
});
