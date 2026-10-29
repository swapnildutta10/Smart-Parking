import { connectToMongoDB, disconnectFromMongoDB } from './mongodb.mjs';

try {
  const client = await connectToMongoDB();
  await client.db('admin').command({ ping: 1 });
  console.log('MongoDB ping succeeded.');
} catch (error) {
  console.error('MongoDB connection check failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectFromMongoDB();
}
