// servers/home/required-rep.js
async function main(ns) {
  const r = Number.parseInt(ns.args[0]);
  const rep = 1.02 ** (r - 1) * 25500 - 25e3;
  const total = 1.02 ** (150 - 1) * 25500 - 25e3;
  ns.tprint(`Required rep this install: ${total - rep}`);
}
export {
  main
};
