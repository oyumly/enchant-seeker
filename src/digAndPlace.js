const Vec3 = require("vec3").Vec3;

let lastLecternPosition = null;

function isLectern(block) {
  return block.name === "lectern";
}

async function dig(bot) {
  const isAxeEquipped = bot.heldItem && bot.heldItem.name.includes("axe");
  if (!isAxeEquipped) {
    const axe = bot.inventory
      .items()
      .find((item) => item.name.includes("axe"));
    if (axe) {
      try {
        await bot.equip(axe, "hand");
      } catch (e) {
        console.log("Error equipping axe:", e.message);
      }
    }
  }

  let block = bot.findBlock({
    matching: isLectern,
    maxDistance: 4,
  });

  if (block) {
    lastLecternPosition = block.position.clone();
    try {
      await bot.dig(block);
    } catch (e) {
      console.log("Error digging lectern:", e.message);
    }
  }
}

async function place(bot) {
  const offhandItem = bot.inventory.slots[45];
  const isLecternInOffhand = offhandItem && offhandItem.name.includes("lectern");
  
  if (!isLecternInOffhand) {
    const lectern = bot.inventory
      .items()
      .find((item) => item.name.includes("lectern"));
    if (lectern) {
      try {
        await bot.equip(lectern, "off-hand");
      } catch (e) {
        console.log("Error equipping lectern to off-hand:", e.message);
      }
    }
  }

  if (!lastLecternPosition) {
    console.log("No known lectern position to place at.");
    return;
  }

  let sourcePosition = lastLecternPosition.offset(0, -1, 0);
  let sourceBlock = bot.blockAt(sourcePosition);
  if (bot.entity.position.distanceTo(lastLecternPosition) < 1.2) {
      bot.setControlState('back', true);
      await bot.waitForTicks(5);
      bot.setControlState('back', false);
  }

  if (sourceBlock) {
    try {
      await bot._placeBlockWithOptions(sourceBlock, new Vec3(0, 1, 0), { offhand: true, swingArm: 'left' });
    } catch (e) {
      console.log("Error placing lectern:", e.message);
    }
  }
}

module.exports = { dig, place };