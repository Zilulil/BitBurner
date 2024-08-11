// servers/home/find-coding-contracts.js
async function main(ns) {
  ns.disableLog("ALL");
  const dfs = (s) => [s, ...ns.scan(s).slice(s != "home").flatMap(dfs)];
  dfs("home").forEach((s) => {
    ns.ls(s, ".cct").forEach((f) => ns.tprint(`Coding contract exists on ${s}: ${f}, ${ns.codingcontract.getContractType(f, s)}`));
  });
}
export {
  main
};
