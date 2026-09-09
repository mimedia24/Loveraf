const mongoose = require('mongoose');

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {autoIndex: process.env.NODE_ENV !== 'production'});
  return mongoose.connection;
}

async function disconnectDatabase() { await mongoose.disconnect(); }
module.exports = {connectDatabase, disconnectDatabase};
