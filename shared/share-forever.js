// servers/home/shared/share-forever.js
async function main(ns) {
  while (true) {
    await ns.share();
  }
}
export {
  main
};
