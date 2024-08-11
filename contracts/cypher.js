// servers/home/contracts/cypher.js
async function main(ns) {
  let cypher = [];
  const A = "A".charCodeAt(0);
  for (let row = 0; row < 26; row++) {
    cypher.push([]);
    for (let col = 0; col < 26; col++) {
      cypher[row].push(String.fromCharCode((col + row) % 26 + A));
    }
  }
  let contract = ns.args[1];
  const [plaintext, key] = ns.codingcontract.getData(contract, ns.args[0]);
  let answer = [...plaintext].map((c, i) => cypher[c.charCodeAt(0) - A][key.charCodeAt(i % key.length) - A]).join("");
  let reward = ns.codingcontract.attempt(answer, contract, ns.args[0]);
  if (reward) {
    ns.tprint("Contract completed, reward: ", reward);
  } else {
    ns.tprint("Contract failed");
  }
}
export {
  main
};
