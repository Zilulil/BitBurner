// servers/home/contracts/routing.js
var top = 0;
var parent = (i) => (i + 1 >>> 1) - 1;
var left = (i) => (i << 1) + 1;
var right = (i) => i + 1 << 1;
var PriorityQueue = class {
  constructor(comparator = (a, b) => a > b) {
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  push(...values) {
    values.forEach((value) => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = top;
    while (left(node) < this.size() && this._greater(left(node), node) || right(node) < this.size() && this._greater(right(node), node)) {
      let maxChild = right(node) < this.size() && this._greater(right(node), left(node)) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
};
async function main(ns) {
  const contract = ns.args[1];
  const server = ns.args[0];
  const input = ns.codingcontract.getData(contract, server);
  let queue = new PriorityQueue((a, b) => b.route.length > a.route.length);
  let visited = /* @__PURE__ */ new Set();
  queue.push(Node([0, 0], ""));
  let goal = [input.length - 1, input[input.length - 1].length - 1];
  function is_goal(node) {
    return node.coords[0] === goal[0] && node.coords[1] === goal[1];
  }
  while (!queue.isEmpty() && !is_goal(queue.peek())) {
    const { coords, route } = queue.pop();
    if (visited.has(JSON.stringify(coords))) {
      continue;
    }
    visited.add(JSON.stringify(coords));
    if (coords[0] - 1 >= 0 && input[coords[0] - 1][coords[1]] === 0) {
      queue.push(Node([coords[0] - 1, coords[1]], route + "U"));
    }
    if (coords[0] + 1 < input.length && input[coords[0] + 1][coords[1]] === 0) {
      queue.push(Node([coords[0] + 1, coords[1]], route + "D"));
    }
    if (coords[1] - 1 >= 0 && input[coords[0]][coords[1] - 1] === 0) {
      queue.push(Node([coords[0], coords[1] - 1], route + "L"));
    }
    if (coords[1] + 1 < input[coords[0]].length && input[coords[0]][coords[1] + 1] === 0) {
      queue.push(Node([coords[0], coords[1] + 1], route + "R"));
    }
  }
  let answer = "";
  if (!queue.isEmpty()) {
    answer = queue.pop().route;
  }
  let reward = ns.codingcontract.attempt(answer, contract, server);
  if (reward) {
    ns.tprint("Contract solved successfully, reward: ", reward);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}
function Node(coords, route) {
  return { coords, route };
}
export {
  main
};
