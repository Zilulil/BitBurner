// servers/home/share.js
var SCRIPT_RAM = 1.75;
async function main(ns) {
  ns.disableLog("ALL");
  const flags = ns.flags([
    ["kill_all", false],
    ["share_percent", 1]
  ]);
  ns.print("Finding servers");
  let tmp = ns.read("/valid_servers.txt");
  let servers = tmp.split(",");
  let workers = servers.filter((server) => ns.hasRootAccess(server) && ns.getServerMaxRam(server) != 0).sort((a, b) => GetThreadCount(ns, a) - GetThreadCount(ns, b));
  ns.run("killall.js", 1, "shared/share-forever.js");
  await ns.sleep(1);
  if (flags.kill_all) {
    ns.exit();
  }
  let total_threads = Math.floor(workers.map((w) => GetThreadCount(ns, w, 4)).reduce((acc, x) => acc + x) * flags.share_percent);
  for (const worker of workers) {
    if (total_threads <= 0) {
      break;
    }
    const thread_count = GetThreadCount(ns, worker, 4);
    if (thread_count === 0) {
      continue;
    }
    const t = Math.min(thread_count, total_threads);
    ns.exec("/shared/share-forever.js", worker, { threads: t, temporary: true });
    total_threads -= t;
  }
  await ns.sleep(1);
  ns.print(`Share power: ${ns.getSharePower()}`);
}
function GetThreadCount(ns, worker, ram = SCRIPT_RAM) {
  let used_ram = worker != "home" ? ns.getServerUsedRam(worker) : ns.getServerUsedRam(worker) + 20;
  return Math.floor((ns.getServerMaxRam(worker) - used_ram) / ram);
}
export {
  main
};
