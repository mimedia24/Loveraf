const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApplication } = require("../app");

test("authentication endpoints reject excessive repeated attempts", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    APP_ORIGINS: process.env.APP_ORIGINS,
  };
  process.env.NODE_ENV = "test";
  process.env.JWT_ACCESS_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  process.env.APP_ORIGINS = "http://localhost:3000";

  const { app, server, io } = createApplication();
  try {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const response = await request(app).post("/api/v1/auth/login").send({});
      assert.equal(response.status, 400);
    }
    const limited = await request(app).post("/api/v1/auth/login").send({});
    assert.equal(limited.status, 429);
    assert.match(String(limited.headers["ratelimit-policy"] || ""), /50/);
  } finally {
    io.close();
    server.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
