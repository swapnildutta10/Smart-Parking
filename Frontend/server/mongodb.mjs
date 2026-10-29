import { MongoClient } from 'mongodb';

let client;
let connectionPromise;

export async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<db_password>')) {
    throw new Error('Set MONGODB_URI with your database password in the root .env file.');
  }

  if (!connectionPromise) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    connectionPromise = client.connect().then(() => {
      console.log('You successfully connected to MongoDB!');
      return client;
    }).catch(async (error) => {
      await client.close();
      client = undefined;
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

// Call only when the server shuts down, not after each request.
export async function disconnectFromMongoDB() {
  if (connectionPromise) {
    await connectionPromise.catch(() => {});
  }
  if (client) {
    await client.close();
    client = undefined;
    connectionPromise = undefined;
  }
}
