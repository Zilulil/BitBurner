// servers/home/travel-loop.js
async function main(ns) {
  const program = "ServerProfiler.exe";
  let i = 1;
  while (true) {
    ns.rm(program);
    ns.singularity.purchaseProgram(program);
    i++;
    if (i % 1e3 === 0) {
      i = 1;
      await ns.sleep(1e3);
    }
  }
}
export {
  main
};
