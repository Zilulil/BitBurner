// servers/home/contracts/stock-trader-2.js
async function main(ns) {
  const contract = ns.args[1];
  const server = ns.args[0];
  const input = [190, 104, 195];
  ns.tprint(input);
  ns.exit();
  let current_stock = 0;
  let total_value = 0;
  let reward = ns.codingcontract.attempt(best_spread, contract, server);
  if (reward) {
    ns.tprint("Contract solved successfully, reward: ", reward);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}
export {
  main
};
