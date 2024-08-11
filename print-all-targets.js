// servers/home/print-all-targets.js
function get_ratio_for_server_formula(ns, server) {
  let player = ns.getPlayer();
  let so = ns.getServer(server);
  so.hackDifficulty = so.minDifficulty;
  if (so.requiredHackingSkill > player.skills.hacking) {
    return 0;
  }
  let weight = so.moneyMax / ns.formulas.hacking.weakenTime(so, player) * ns.formulas.hacking.hackChance(so, player);
  return weight;
}
function get_ratio_for_server(ns, server) {
  let player = ns.getPlayer();
  let so = ns.getServer(server);
  so.hackDifficulty = so.minDifficulty;
  if (so.requiredHackingSkill > player.skills.hacking / 2) {
    return 0;
  }
  let weight = so.moneyMax / so.minDifficulty;
  return weight;
}
async function main(ns) {
  let tmp = ns.read("/valid_servers.txt");
  let servers = tmp.split(",").filter((s) => ns.getServerMaxMoney(s) > 0);
  let no_formula = servers.map((s) => {
    return { server: s, ratio: get_ratio_for_server(ns, s) };
  }).sort((a, b) => b.ratio - a.ratio);
  if (ns.fileExists("Formulas.exe")) {
    let formula = servers.map((s) => {
      return { server: s, ratio: get_ratio_for_server_formula(ns, s) };
    }).sort((a, b) => b.ratio - a.ratio);
    ns.tprint("");
    ns.tprint("Order for servers with formula");
    for (const { server, ratio } of formula) {
      ns.tprint(`${server}: ${ns.formatNumber(ratio)}. Min Skill: ${ns.getServerRequiredHackingLevel(server)}`);
    }
  }
}
export {
  main
};
