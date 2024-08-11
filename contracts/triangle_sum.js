// servers/home/contracts/triangle_sum.js
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
  let queue = new PriorityQueue((a, b) => a.sum < b.sum);
  queue.push(Node([0, 0], input[0][0]));
  let cur;
  debugger;
  while (!queue.isEmpty()) {
    cur = queue.pop();
    const row = cur.coords[0];
    const col = cur.coords[1];
    if (row === input.length - 1) {
      break;
    }
    queue.push(Node([row + 1, col], cur.sum + input[row + 1][col]));
    queue.push(Node([row + 1, col + 1], cur.sum + input[row + 1][col + 1]));
  }
  let reward = ns.codingcontract.attempt(cur.sum, contract, server);
  if (reward) {
    ns.tprint(`Successfully completed contract for ${reward}`);
  } else {
    ns.tprint("Failed contract");
  }
}
function Node(coords, sum) {
  return { coords, sum };
}
export {
  main
};
