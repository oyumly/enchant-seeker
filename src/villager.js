const { place, dig } = require("./digAndPlace");
const { log, logEmitter } = require("./utils");
const { goals } = require("mineflayer-pathfinder");
const enchantmentTranslations = require("../config/AllEnchantTranslate");

let isTrading = false;
let currentSessionId = 0;
let targetEnchantments = [];
let searchStartTime = 0;

function setTargetEnchantments(enchants) {
  targetEnchantments = enchants;
}

async function checkVillager(bot) {
  try {
    const target = bot.nearestEntity((e) => e.name === "villager");
    if (!target) {
      console.log("Villager not found.");
      return;
    }

    const distance = bot.entity.position.distanceTo(target.position);
    if (distance > 3) {
      bot.chat("Approaching the villager...");
      try {
        const { Movements } = require("mineflayer-pathfinder");
        const defaultMove = new Movements(bot);
        defaultMove.canDig = false;
        defaultMove.allow1by1towers = false;
        bot.pathfinder.setMovements(defaultMove);
        await bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2));
      } catch (e) {
        console.log("Pathfinding to villager failed or was interrupted:", e.message);
      }
    }

    await bot.lookAt(target.position);
    const villager = await bot.openVillager(target);

    for (const trade of villager.trades) {
      const nbt = trade.outputItem?.nbt;
      if (nbt) {
        const enchantments = nbt?.value?.StoredEnchantments?.value?.value;
        if (!enchantments || !enchantments[0]) continue;

        const id = enchantments[0].id?.value;
        const lvl = enchantments[0].lvl?.value;
        if (!id || !lvl) continue;

        const price = trade.inputItem1.count;

        let isSuccess = false;
        for (const enchant of targetEnchantments) {
          if (id === enchant.enchant && lvl >= enchant.level) {
            isSuccess = true;
            console.log("\n\n\n===Enchantment found===\n\n\n");
            bot.chat("Enchantment found!");

            const timeTaken = Date.now() - searchStartTime;
            logEmitter.emit('log', {
              type: 'success',
              enchKey: id.replace('minecraft:', ''),
              lvl: lvl,
              price: price,
              timeMs: timeTaken
            });

            villager.close();
            isTrading = false;
            break;
          }
        }

        if (!isSuccess) {
          log(id, lvl, price);
        } else {
          break;
        }
      }
    }

    villager.close();
  } catch (error) {
    console.error("Error checking villager:", error);
  }
}

async function trading(bot) {
  if (isTrading) {
    console.log("Trading is already running.");
    return;
  }
  isTrading = true;
  searchStartTime = Date.now();
  currentSessionId++;
  const mySessionId = currentSessionId;

  while (isTrading && mySessionId === currentSessionId) {
    await checkVillager(bot);
    if (!isTrading || mySessionId !== currentSessionId) break;
    await bot.waitForTicks(3);
    if (!isTrading || mySessionId !== currentSessionId) break;
    await dig(bot);
    if (!isTrading || mySessionId !== currentSessionId) break;
    await bot.waitForTicks(3);
    if (!isTrading || mySessionId !== currentSessionId) break;
    await place(bot);
    if (!isTrading || mySessionId !== currentSessionId) break;
    await bot.waitForTicks(35);
  }
}

function stopTrading() {
  isTrading = false;
  try {
    const { bot } = require("./bot");
    bot.pathfinder.stop();
  } catch (e) { }
}

function getStatus() {
  return isTrading;
}

module.exports = { trading, stopTrading, setTargetEnchantments, getStatus };