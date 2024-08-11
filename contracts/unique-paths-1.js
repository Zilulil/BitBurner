// servers/home/contracts/unique-paths-1.js
async function main(ns) {
  let contract = ns.args[1];
  let server = ns.args[0];
  const [row, col] = ns.codingcontract.getData(contract, server);
  let stack = [[0, 0]];
  let total_routes = 0;
  while (stack.length != 0) {
    let [r, c] = stack.pop();
    if (r === row - 1 && c === col - 1) {
      total_routes++;
      continue;
    }
    if (r + 1 < row) {
      stack.push([r + 1, c]);
    }
    if (c + 1 < col) {
      stack.push([r, c + 1]);
    }
  }
  let answer = total_routes;
  let reward = ns.codingcontract.attempt(answer, contract, server);
  if (reward) {
    ns.tprint("Contract completed, reward: ", reward);
  } else {
    ns.tprint("Contract failed");
  }
}
export {
  main
};
