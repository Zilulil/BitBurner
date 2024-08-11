
const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const grandparent = i => parent(parent(i));
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;
const level = i => Math.floor(Math.log2(i + 1));

export class PriorityQueue<T> {
  _heap: T[];
  _comparator: (a: T, b: T) => number;

  constructor(comparator = (a, b) => a - b) {
    this._heap = [];
    this._comparator = comparator;
  }
  size() { return this._heap.length; }
  isEmpty() { return this.size() == 0; }
  peek() { return this._heap[top]; }
  push(...values) {
    values.forEach(value => {
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
  _greater(i, j) { return this._comparator(this._heap[i], this._heap[j]); }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [ this._heap[j], this._heap[i] ];
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
    while ((left(node) < this.size() && this._greater(left(node), node)) ||
           (right(node) < this.size() && this._greater(right(node), node))) {
      let maxChild =
          (right(node) < this.size() && this._greater(right(node), left(node)))
              ? right(node)
              : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}

/**
 * Priority queue that supports constant time lookups of min and max values
 * as well as log2 removals of both. peek and pop are defined to return the
 * minimum values, while peek_last and pop_last are for the maximum.
 */
export class MinMaxQueue<T> {
  _heap: T[];
  _comparator: (a: T, b: T) => number;

  constructor(heap = [], comparator = (a, b) => a - b) {
    this._heap = heap;
    this._comparator = comparator;
    this._build_heap();
  }

  size(): number { return this._heap.length; }

  is_empty(): boolean { return this.size() === 0; }

  /** Peeks the min value. */
  peek(): T { return this._heap[top]; }

  /** Pop the smallest item. */
  pop(): T {
    const ret = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._push_down(top);
    return ret;
  }

  push(...values) {
    for (const value of values) {
      this._heap.push(value);
      this._push_up(this.size() - 1);
    }
  }

  /** Peek the largest item */
  peek_last() {
    if (this.size() === 1) {
      return this.peek();
    }
    if (this.size() === 2) {
      return this._heap[left(top)];
    }
    if (this._comparator(this._heap[left(top)], this._heap[right(top)]) > 0) {
      return this._heap[left(top)];
    } else {
      return this._heap[right(top)];
    }
  }

  /** Pop the largest item */
  pop_last() {
    if (this.size() === 1 || this.size() === 2) {
      return this._heap.pop();
    }
    let i;
    if (this._comparator(this._heap[left(top)], this._heap[right(top)]) > 0) {
      i = left(top);
    } else {
      i = right(top);
    }
    let bottom = this.size() - 1;
    this._swap(i, bottom);
    let ret = this._heap.pop();
    this._push_down(i);
    return ret;
  }

  map(func) { return this._heap.map(func); }

  includes(item) { return this._heap.includes(item); }

  _build_heap() {
    for (let i = Math.floor(this.size() / 2); i >= 0; i--) {
      this._push_down(i);
    }
  }

  _push_down(m) {
    while (left(m) < this._heap.length || right(m) < this._heap.length) {
      let i = m;
      // Min level
      if (level(i) % 2 === 0) {
        m = this._index_of_min_grandchild(i);
        if (this._comparator(this._heap[m], this._heap[i]) < 0) {
          this._swap(m, i);
          // If m is a grandchild of i
          if (m !== left(i) && m !== right(i)) {
            if (this._comparator(this._heap[m], this._heap[parent(m)]) > 0) {
              this._swap(m, parent(m));
            }
          } else {
            break;
          }
        } else {
          break;
        }
        // Max level
      } else {
        m = this._index_of_max_grandchild(i);
        if (this._comparator(this._heap[m], this._heap[i]) > 0) {
          this._swap(m, i);
          // If m is a grandchild of i
          if (m !== left(i) && m !== right(i)) {
            if (this._comparator(this._heap[m], this._heap[parent(m)]) < 0) {
              this._swap(m, parent(m));
            }
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
  }

  _push_up(i) {
    if (i !== 0) {
      if (level(i) % 2 === 0) {
        if (this._comparator(this._heap[i], this._heap[parent(i)]) > 0) {
          this._swap(i, parent(i));
          this._push_up_max(parent(i));
        } else {
          this._push_up_min(i);
        }
      } else {
        if (this._comparator(this._heap[i], this._heap[parent(i)]) < 0) {
          this._swap(i, parent(i));
          this._push_up_min(parent(i));
        } else {
          this._push_up_max(i);
        }
      }
    }
  }

  _push_up_min(i) {
    while (i !== 0 && parent(i) !== 0 &&
           this._comparator(this._heap[i], this._heap[grandparent(i)]) < 0) {
      this._swap(i, grandparent(i));
      i = grandparent(i);
    }
  }

  _push_up_max(i) {
    while (i !== 0 && parent(i) !== 0 &&
           this._comparator(this._heap[i], this._heap[grandparent(i)]) > 0) {
      this._swap(i, grandparent(i));
      i = grandparent(i);
    }
  }

  _index_of_min_grandchild(i) {
    return [ left(i), right(i) ]
        .flatMap(i => [i, left(i), right(i)])
        .filter(i => i < this._heap.length)
        .sort((a, b) => this._comparator(this._heap[a], this._heap[b]))[0];
  }

  _index_of_max_grandchild(i) {
    return [ left(i), right(i) ]
        .flatMap(i => [i, left(i), right(i)])
        .filter(i => i < this._heap.length)
        .sort((a, b) => this._comparator(this._heap[b], this._heap[a]))[0];
  }

  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [ this._heap[j], this._heap[i] ];
  }
}

/** @param {NS} ns */
export async function main(ns: NS) {
  let pq = new MinMaxQueue([ 9, 2, 1, 4, 3, 7, 6, 8, 5 ]);
  ns.tprint("smallest: ", pq.peek());
  ns.tprint("largest: ", pq.peek_last());
  ns.tprint("Printing from smallest to largest");
  while (!pq.is_empty()) {
    ns.tprint(pq.pop());
  }
  pq = new MinMaxQueue([ 3, 2, 1, 4, 9, 7, 6, 8, 5 ]);

  ns.tprint("Printing from largest to smallest");
  while (!pq.is_empty()) {
    ns.tprint(pq.pop_last());
  }

  pq.push(3, 2, 1, 4, 9, 7, 6, 8, 5);
  ns.tprint("smallest: ", pq.peek());
  ns.tprint("largest: ", pq.peek_last());

  ns.tprint("Printing from smallest to largest");
  while (!pq.is_empty()) {
    ns.tprint(pq.pop());
  }
  pq.push(3, 2, 1, 4, 9, 7, 6, 8, 5);

  ns.tprint("Printing from largest to smallest");
  while (!pq.is_empty()) {
    ns.tprint(pq.pop_last());
  }
}
