// servers/home/contracts/stock-trader-1.js
async function main(ns) {
  const contract = ns.args[1];
  const server = ns.args[0];
  const input = ns.codingcontract.getData(contract, server);
  let best_spread = 0;
  for (let i = 0; i < input.length; i++) {
    for (let j = i + 1; j < input.length; j++) {
      if (input[j] - input[i] > best_spread) {
        best_spread = input[j] - input[i];
      }
    }
  }
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
