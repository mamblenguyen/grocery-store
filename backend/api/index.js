// Entry serverless cho Vercel: mọi request được rewrite về đây (xem vercel.json).
// Nest app được khởi tạo 1 lần và tái sử dụng giữa các lần gọi (warm start).
const { createApp } = require('../dist/bootstrap');

let handlerPromise;

async function getHandler() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

module.exports = async (req, res) => {
  handlerPromise = handlerPromise || getHandler().catch((e) => { handlerPromise = undefined; throw e; });
  const handler = await handlerPromise;
  return handler(req, res);
};
