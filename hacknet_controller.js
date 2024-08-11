// servers/home/hacknet_controller.js
async function main(ns) {
  ns.disableLog("ALL");
  const getMoney = () => ns.getPlayer().money;
  const getProd = (level, ram, cores) => level * 1.5 * Math.pow(1.035, ram - 1) * ((cores + 5) / 6);
  const PROD_MULTIPLIER = ns.getHacknetMultipliers().production;
  const WAITING_TIME = ns.args[0] || 30;
  if (!ns.hacknet.numNodes()) {
    while (getMoney() < ns.hacknet.getPurchaseNodeCost()) {
      await ns.sleep(1);
    }
    ns.print("Purchasing new hacknet node");
    ns.hacknet.purchaseNode();
  }
  while (true) {
    const ratios = [];
    let hacknetProduction = 0;
    for (let index = 0; index < ns.hacknet.numNodes(); index++) {
      const { level, ram, cores, production } = ns.hacknet.getNodeStats(index);
      hacknetProduction += production;
      const levelUpgradeCost = ns.hacknet.getLevelUpgradeCost(index);
      const ramUpgradeCost = ns.hacknet.getRamUpgradeCost(index);
      const coreUpgradeCost = ns.hacknet.getCoreUpgradeCost(index);
      const levelUpgradeRatio = (getProd(level + 1, ram, cores) * PROD_MULTIPLIER - production) / levelUpgradeCost;
      const ramUpgradeRatio = (getProd(level, ram * 2, cores) * PROD_MULTIPLIER - production) / ramUpgradeCost;
      const coreUpgradeRatio = (getProd(level, ram, cores + 1) * PROD_MULTIPLIER - production) / coreUpgradeCost;
      const currentNodeUpgrades = [
        { ratio: levelUpgradeRatio, cost: levelUpgradeCost, nodeIndex: index, upgrade: "level" },
        { ratio: ramUpgradeRatio, cost: ramUpgradeCost, nodeIndex: index, upgrade: "ram" },
        { ratio: coreUpgradeRatio, cost: coreUpgradeCost, nodeIndex: index, upgrade: "core" }
      ];
      ratios.push(...currentNodeUpgrades);
    }
    const { cost, nodeIndex, upgrade } = ratios.sort((a, b) => b.ratio - a.ratio)[0];
    if (cost !== Infinity && cost && cost < getMoney() * 0.01) {
      switch (upgrade) {
        case "level":
          ns.print(`Upgrading ${nodeIndex} level.`);
          ns.hacknet.upgradeLevel(nodeIndex);
          break;
        case "ram":
          ns.print(`Upgrading ${nodeIndex} RAM.`);
          ns.hacknet.upgradeRam(nodeIndex);
          break;
        case "core":
          ns.print(`Upgrading ${nodeIndex} Core.`);
          ns.hacknet.upgradeCore(nodeIndex);
          break;
        default:
          continue;
      }
    }
    const purchaseNodeCost = ns.hacknet.getPurchaseNodeCost();
    const missingMoneyForNewNode = purchaseNodeCost - getMoney() * 0.01;
    if (missingMoneyForNewNode < 0) {
      ns.print("Purchasing new node");
      ns.hacknet.purchaseNode();
    }
    await ns.sleep(1);
  }
}
export {
  main
};
