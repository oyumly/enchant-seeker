const express = require('express');
const cors = require('cors');
const path = require('path');
const { startReroll, stopReroll } = require('./bot');
const { getStatus } = require('./villager');
const { logEmitter } = require('./utils');
const enchantmentTranslations = require('../config/AllEnchantTranslate');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const ruTranslations = {
  "efficiency": "Эффективность", "thorns": "Шипы", "silk_touch": "Шёлковое касание",
  "fortune": "Удача", "riptide": "Тягун", "multishot": "Тройной выстрел",
  "soul_speed": "Скорость души", "power": "Сила", "sweeping": "Разящий клинок",
  "unbreaking": "Прочность", "piercing": "Пронзающая стрела", "impaling": "Пронзатель",
  "vanishing_curse": "Проклятие утраты", "binding_curse": "Проклятие несъёмности",
  "swift_sneak": "Проворство", "breach": "Пробитие", "lure": "Приманка",
  "mending": "Починка", "wind_burst": "Порыв ветра", "respiration": "Подводное дыхание",
  "aqua_affinity": "Подводник", "depth_strider": "Подводная ходьба", "density": "Плотность",
  "punch": "Откидывание", "knockback": "Отдача", "sharpness": "Острота",
  "fire_protection": "Огнеупорность", "feather_falling": "Невесомость", "smite": "Небесная кара",
  "frost_walker": "Ледоход", "protection": "Защита", "projectile_protection": "Защита от снарядов",
  "fire_aspect": "Заговор огня", "looting": "Добыча", "channeling": "Громовержец",
  "flame": "Воспламенение", "blast_protection": "Взрывоустойчивость", "loyalty": "Верность",
  "luck_of_the_sea": "Везучий рыбак", "quick_charge": "Быстрая перезарядка",
  "bane_of_arthropods": "Бич членистоногих", "infinity": "Бесконечность"
};

const maxLevels = {
  "fire_aspect": 2, "multishot": 1, "luck_of_the_sea": 3, "binding_curse": 1, "knockback": 2,
  "frost_walker": 2, "unbreaking": 3, "fortune": 3, "channeling": 1, "loyalty": 3, "protection": 4,
  "smite": 5, "vanishing_curse": 1, "punch": 2, "flame": 1, "piercing": 4, "projectile_protection": 4,
  "looting": 3, "respiration": 3, "riptide": 3, "quick_charge": 3, "lure": 3, "fire_protection": 4,
  "thorns": 3, "feather_falling": 4, "power": 5, "infinity": 1, "sharpness": 5, "impaling": 5,
  "efficiency": 5, "sweeping": 3, "mending": 1, "depth_strider": 3, "blast_protection": 4,
  "silk_touch": 1, "soul_speed": 3, "aqua_affinity": 1, "bane_of_arthropods": 5,
  "swift_sneak": 3, "breach": 4, "wind_burst": 3, "density": 5
};

const minVersions = {
  "soul_speed": 1.16,
  "swift_sneak": 1.19,
  "wind_burst": 1.21,
  "density": 1.21,
  "breach": 1.21
};

app.get('/api/enchants', (req, res) => {
  const enchantsList = Object.entries(enchantmentTranslations).map(([key, name]) => {
    return {
      id: `minecraft:${key}`,
      nameEn: name,
      nameRu: ruTranslations[key] || name,
      maxLevel: maxLevels[key] || 1,
      minVersion: minVersions[key] || 1.14
    };
  });
  res.json(enchantsList);
});

app.post('/api/start', (req, res) => {
  const { enchants } = req.body;
  if (!enchants || !Array.isArray(enchants)) {
    return res.status(400).json({ error: 'Invalid enchantments payload' });
  }

  if (getStatus()) {
    return res.status(400).json({ error: 'Bot is already rerolling' });
  }

  startReroll(enchants);
  
  const targetNames = enchants.map(e => {
    const key = e.enchant.replace('minecraft:', '');
    const roman = ["I", "II", "III", "IV", "V"][e.level - 1] || e.level;
    const name = enchantmentTranslations[key] || key;
    return `${name} ${roman}`;
  }).join(', ');
  
  logEmitter.emit('log', { text: `[System] Started rerolling. Targets: ${targetNames}`, type: 'system', action: 'start_rerolling', targets: enchants });
  res.json({ success: true, message: 'Reroll started' });
});

app.post('/api/stop', (req, res) => {
  if (!getStatus()) {
    return res.status(400).json({ error: 'Bot is not currently rerolling' });
  }

  stopReroll();
  res.json({ success: true, message: 'Reroll stopped' });
});

app.get('/api/status', (req, res) => {
  let mainHand = null;
  let offHand = null;
  let availableAxes = [];

  try {
    const { bot } = require('./bot');
    
    const held = bot.heldItem;
    if (held) {
      mainHand = { name: held.name, count: held.count };
    }

    const off = bot.inventory.slots[45];
    if (off) {
      offHand = { name: off.name, count: off.count };
    }

    const items = bot.inventory.items();
    const axesMap = new Map();
    items.forEach(item => {
      if (item.name.includes("axe")) {
        axesMap.set(item.name, item.count);
      }
    });
    availableAxes = Array.from(axesMap.keys());
  } catch (e) {}
  
  res.json({
    isRunning: getStatus(),
    mainHand: mainHand,
    offHand: offHand,
    availableAxes: availableAxes
  });
});

app.post('/api/equip-axe', (req, res) => {
  const { axeName } = req.body;
  try {
    const { bot } = require('./bot');
    const axe = bot.inventory.items().find(item => item.name === axeName);
    if (axe) {
      bot.equip(axe, 'hand')
        .then(() => {
          logEmitter.emit('log', { text: `[System] Equipped axe: ${axeName.replace(/_/g, ' ')}`, type: 'system', action: 'equip_axe', axeName: axeName });
          res.json({ success: true });
        })
        .catch(err => res.status(500).json({ error: err.message }));
    } else {
      res.status(400).json({ error: 'Axe not found in inventory' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  
  res.flushHeaders();
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  const onLog = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  logEmitter.on('log', onLog);

  res.write(`data: ${JSON.stringify({ text: '[System] Terminal connected to bot logs.', type: 'system', action: 'connected' })}\n\n`);

  req.on('close', () => {
    logEmitter.off('log', onLog);
  });
});

app.listen(PORT, () => {
  console.log(`Web interface running at http://localhost:${PORT}`);
});
