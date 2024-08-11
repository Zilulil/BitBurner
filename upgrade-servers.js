// servers/home/upgrade-servers.js
async function main(ns) {
  const flags = ns.flags([
    ["next_upgrade", false]
  ]);
  if (flags.next_upgrade) {
    let to_upgrade = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))[0];
    ns.tprint(`$${ns.formatNumber(ns.getPurchasedServerUpgradeCost(to_upgrade, ns.getServerMaxRam(to_upgrade) * 2))}`);
    ns.exit();
  }
  ns.tail();
  ns.disableLog("ALL");
  const max_spend = ns.args[0] || Number.POSITIVE_INFINITY;
  const MAX_RAM = ns.getPurchasedServerMaxRam();
  let servers = [...ns.getPurchasedServers(), "home"];
  while (true) {
    let serversToUpgrade = [];
    for (let server of servers) {
      if (server !== "home" && ns.getServerMaxRam(server) < MAX_RAM) {
        let ram = ns.getServerMaxRam(server) * 2;
        serversToUpgrade.push({
          name: server,
          ram,
          cost: ns.getPurchasedServerUpgradeCost(server, ram)
        });
      } else if (server === "home") {
        serversToUpgrade.push({
          name: server,
          ram: ns.getServerMaxRam(server) * 2,
          cost: ns.singularity.getUpgradeHomeRamCost()
        });
      }
    }
    if (serversToUpgrade.length === 0) {
      ns.exit();
    }
    let serverToUpgrade = serversToUpgrade.sort((a, b) => a.cost - b.cost)[0];
    let upgradeCost = serverToUpgrade.cost;
    ns.print(`Next upgrade: $${ns.formatNumber(upgradeCost)}`);
    if (upgradeCost > max_spend) {
      ns.exit();
    }
    while (ns.getServerMoneyAvailable("home") < upgradeCost) {
      await ns.sleep(1e3);
    }
    debugger;
    ns.print(`Upgrading: ${serverToUpgrade.name} to ${ns.formatRam(serverToUpgrade.ram)}`);
    if (serverToUpgrade.name !== "home") {
      ns.upgradePurchasedServer(serverToUpgrade.name, serverToUpgrade.ram);
    } else {
      ns.singularity.upgradeHomeRam();
    }
    await ns.sleep(1);
  }
}
export {
  main
};
