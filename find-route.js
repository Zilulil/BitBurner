// servers/home/find-route.js
async function main(ns) {
  let target = ns.args[0];
  let parent = ns.scan(target)[0];
  let route = [target, parent];
  while (parent != "home") {
    parent = ns.scan(parent)[0];
    route.push(parent);
  }
  ns.tprint(route.reverse().slice(1).map((s) => `connect ${s};`).join(""));
}
export {
  main
};
