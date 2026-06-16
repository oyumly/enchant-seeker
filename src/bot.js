const mineflayer = require("mineflayer");
const pathfinder = require("mineflayer-pathfinder").pathfinder;
const chatHandler = require("../plugins/chatHandler");
const config = require("../config/config.json");
const { trading, stopTrading, setTargetEnchantments } = require("./villager");

const bot = mineflayer.createBot({
  host: config.serverIp,
  port: config.serverPort,
  username: config.botUsername,
  version: config.versionForConnect,
  hideErrors: true,
  logErrors: false,
});

bot.loadPlugin(pathfinder);
chatHandler(bot);

const { logEmitter } = require("./utils");

bot.on("kicked", (reason) => {
  console.log(`Bot was kicked. Reason: ${reason}`);
  logEmitter.emit('log', { text: `[System] Бот был кикнут. Причина: ${reason}`, type: 'error' });
});

bot.on("error", (err) => {
  console.log(`Bot encountered an error: ${err.message}`);
  logEmitter.emit('log', { text: `[System] Ошибка бота (скорее всего сервер выключен): ${err.message}`, type: 'error' });
});

bot.on("end", (reason) => {
  console.log(`Bot disconnected. Reason: ${reason}`);
  logEmitter.emit('log', { text: `[System] Бот отключен от сервера.`, type: 'error' });
  stopTrading();
});

function startReroll(enchants) {
  setTargetEnchantments(enchants);
  trading(bot);
}

function stopReroll() {
  stopTrading();
}

module.exports = { bot, startReroll, stopReroll };