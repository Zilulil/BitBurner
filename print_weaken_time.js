// servers/home/print_weaken_time.js
async function main(ns) {
  ns.tprint(`Weaken time: ${ns.tFormat(ns.getWeakenTime(ns.args[0]), true)}`);
}
export {
  main
};
