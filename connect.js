// servers/home/connect.js
async function main(ns) {
  const target = ns.args[0];
  let parent = ns.scan(target)[0];
  let route = [target, parent];
  while (parent != "home") {
    parent = ns.scan(parent)[0];
    route.push(parent);
  }
  for (const server of route.reverse()) {
    ns.singularity.connect(server);
  }
}
export {
  main
};
