// servers/home/scan.js
async function main(ns) {
  ns.disableLog("ALL");
  ns.enableLog("sleep");
  ns.print("Scanning network for new servers");
  function dfs(ns2, root) {
    const slice_amount = root === "home" ? 0 : 1;
    return [root, ...ns2.scan(root).slice(slice_amount).flatMap((s) => dfs(ns2, s))];
  }
  let servers = dfs(ns, "home").slice(1);
  let to_write = ["home"];
  for (let server of servers) {
    let num_ports = 0;
    if (ns.fileExists("/BruteSSH.exe")) {
      ns.brutessh(server);
      num_ports++;
    }
    if (ns.fileExists("/FTPCrack.exe")) {
      ns.ftpcrack(server);
      num_ports++;
    }
    if (ns.fileExists("relaySMTP.exe")) {
      ns.relaysmtp(server);
      num_ports++;
    }
    if (ns.fileExists("HTTPWorm.exe")) {
      ns.httpworm(server);
      num_ports++;
    }
    if (ns.fileExists("SQLInject.exe")) {
      ns.sqlinject(server);
      num_ports++;
    }
    if (num_ports >= ns.getServerNumPortsRequired(server) || ns.hasRootAccess(server)) {
      ns.nuke(server);
      to_write.push(server);
      ns.scp(["/shared/weaken.js", "/shared/grow.js", "/shared/hack.js", "/shared/share.js", "/shared/share-forever.js"], server, "home");
    }
  }
  ns.write("valid_servers.txt", to_write.join(","), "w");
}
export {
  main
};
