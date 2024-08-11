// servers/home/display-server-information.js
async function main(ns) {
  let so = ns.getServer(ns.args[0]);
  ns.tprint(`Server information for ${ns.args[0]}:
  Current Security: ${so.hackDifficulty}
  Min Security: ${so.minDifficulty}
  Current Money: $${ns.formatNumber(so.moneyAvailable)}
  Max Money: $${ns.formatNumber(so.moneyMax)}`);
}
export {
  main
};
