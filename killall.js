// servers/home/killall.js
async function main(ns) {
  const dfs = (s) => [s, ...ns.scan(s).slice(s != "home").flatMap(dfs)];
  const servers = dfs("home");
  for (const server of servers) {
    ns.ps(server).filter((s) => s.filename === ns.args[0]).map((s) => s.pid).forEach((pid) => ns.kill(pid));
  }
}
export {
  main
};
