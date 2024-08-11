// servers/home/contracts/overlapping-range.js
async function main(ns) {
  debugger;
  const contract = ns.args[1];
  const server = ns.args[0];
  const input = ns.codingcontract.getData(contract, server).sort((a, b) => a[0] - b[0]);
  let answer = [];
  while (input.length != 0) {
    let pair1 = input.shift();
    for (let i = 0; i < input.length; i++) {
      let pair2 = input[i];
      if (pair2[0] <= pair1[1]) {
        input.splice(i, 1);
        pair1[1] = pair2[1];
      }
    }
    answer.push(pair1);
  }
  let reward = ns.codingcontract.attempt(answer, contract, server);
  if (reward) {
    ns.tprint("Contract solved successfully, reward: ", reward);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}
export {
  main
};
