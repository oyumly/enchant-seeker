const readline = require("readline");

/**
 * @param {mineflayer.Bot} bot
 */
module.exports = (bot) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  bot.on("message", (message) => {
    console.log(message.toAnsi());
  });

  rl.on("line", (input) => {
    bot.chat(input);
  });
};