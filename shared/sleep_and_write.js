// servers/home/shared/sleep_and_write.js
async function main(ns) {
  let wait_time = ns.args[0];
  let pid = ns.args[1];
  await ns.sleep(wait_time);
  ns.writePort(pid, ".");
}
export {
  main
};
