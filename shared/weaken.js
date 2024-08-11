// servers/home/shared/weaken.js
var dummy = {};
async function main(ns) {
  let wait_time = 0;
  let additional_args = {};
  if (ns.args[1]) {
    additional_args = JSON.parse(ns.args[1]);
    wait_time = additional_args.wait_time;
  }
  await ns.weaken(ns.args[0], { additionalMsec: wait_time });
  let port = additional_args.port || 0;
  if (port != 0) {
    ns.writePort(port, "Weaken done.");
  }
}
export {
  dummy,
  main
};
