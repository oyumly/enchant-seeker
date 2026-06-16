const EventEmitter = require('events');
const enchantmentTranslations = require("../config/AllEnchantTranslate");

const logEmitter = new EventEmitter();

function log(enchant, level, price) {
  const enchantmentKey = enchant.replace("minecraft:", "");
  const enchantmentTranslation =
    enchantmentTranslations[enchantmentKey] || enchantmentKey;

  const romanNumerals = ["I", "II", "III", "IV", "V"];
  const romanLevel = romanNumerals[level - 1] || level;

  const logMessage = `Ench: ${enchantmentTranslation} || Lvl: ${romanLevel} || Price: ${price} emeralds`;
  console.log(`\n${logMessage}`);
  logEmitter.emit('log', { text: logMessage, type: 'info', price, name: enchantmentTranslation, romanLevel, enchKey: enchantmentKey, lvl: level });
}

module.exports = { log, logEmitter };