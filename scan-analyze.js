// servers/home/scan-analyze.js
async function main(ns) {
  ns.tprint(dfs(ns));
}
function dfs(ns) {
  function helper(ns2, root, depth) {
    let result = "";
    if (root != "home") {
      result = "-".repeat(depth - 1) + root;
    }
    debugger;
    const slice_amount = root === "home" ? 0 : 1;
    return [result, ...ns2.scan(root).slice(slice_amount).map((n) => helper(ns2, n, depth + 1))].join("\n");
  }
  return helper(ns, "home", 0);
}
export {
  main
};
