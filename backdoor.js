// servers/home/backdoor.js
async function main(ns) {
  const target = ns.args[0];
  if (ns.getServerRequiredHackingLevel(target) > ns.getHackingLevel()) {
    ns.tprint(`ERROR: Required ${ns.getServerRequiredHackingLevel(target)} hacking, only have ${ns.getHackingLevel()}.`);
    ns.exit();
  }
  let parent = ns.scan(target)[0];
  let route = [target, parent];
  while (parent != "home") {
    parent = ns.scan(parent)[0];
    route.push(parent);
  }
  for (const server of route.reverse()) {
    ns.singularity.connect(server);
  }
  await ns.singularity.installBackdoor();
  ns.singularity.connect("home");
}
export {
  main
};
