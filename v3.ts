import {MinMaxQueue} from "./libraries/priority_queue.js";
import {dummy as dummy_grow} from "./shared/grow.js";
import {dummy as dummy_hack} from "./shared/hack.js";
import {dummy as dummy_weaken} from "./shared/weaken.js";

const SCRIPT_RAM = 1.75;
const DIFFICULTY_PER_HACK = 0.002;
const DIFFICULTY_PER_GROW = 0.004;
const WEAKEN_PER_GROW = DIFFICULTY_PER_GROW / 0.05;
const WEAKEN_PER_HACK = DIFFICULTY_PER_HACK / 0.05;
const WAIT_TIME = 100;
const BATCH_LIMIT = 200_000;

/**
 * @param {NS} ns
 * @param {string} worker
 */
function GetThreadCount(ns: NS, worker: string,
                        ram: number = SCRIPT_RAM): number {
  let used_ram = worker !== "home" ? ns.getServerUsedRam(worker)
                                   : ns.getServerUsedRam(worker) + 20;
  used_ram = Math.min(ns.getServerMaxRam(worker), used_ram);
  return Math.floor((ns.getServerMaxRam(worker) - used_ram) / ram);
}

function find_best_server(ns, servers) {
  let target_server =
      servers
          .map(
              (s) => {return { server: s, ratio: get_ratio_for_server(ns, s) }})
          .sort((a, b) => a.ratio - b.ratio)
          .reverse()[0]
          .server;
  ns.print(target_server, " selected");
  return target_server;
}

/** @param {NS} ns */
function get_ratio_for_server(ns, server) {
  let player = ns.getPlayer();
  let so = ns.getServer(server);
  so.hackDifficulty = so.minDifficulty;
  if (so.requiredHackingSkill > player.skills.hacking) {
    return 0;
  }
  let weight = so.moneyMax / ns.formulas.hacking.weakenTime(so, player) *
               ns.formulas.hacking.hackChance(so, player);
  return weight;
}

/**
 * @param {NS} ns
 * @param {number} duration
 * @param {string[]} workers
 */
async function sleep(ns, duration, workers) {
  const share_duration = 10 * 1000 + WAIT_TIME
  ns.printf("Sleeping for %s", ns.tFormat(duration))
      // while (duration >= share_duration + WAIT_TIME) {
      //   for (let worker of workers) {
      //     // Share is beefy
      //     let thread_count = GetThreadCount(ns, worker, 4);
      //     if (thread_count <= 0) {
      //       continue
      //     }
      //     ns.exec("/shared/share.js", worker, { threads: thread_count,
      //     temporary: true })
      //   }
      //   await ns.sleep(share_duration)
      //   duration -= share_duration
      // }
      await ns.sleep(duration)
}

/** @param {NS} ns */
export async function main(ns) {
  ns.clearPort(ns.pid);
  ns.disableLog("ALL");
  ns.tail();
  while (true) {
    ns.print("Finding servers")
    let tmp = ns.read("/valid_servers.txt")
    let servers = tmp.split(',')
    let target_server = ns.args[0] || find_best_server(ns, servers)

    let workers =
        servers
            .filter((server) => ns.hasRootAccess(server) &&
                                GetThreadCount(ns, server) !== 0)
            .sort((a, b) => GetThreadCount(ns, b) - GetThreadCount(ns, a));

    if (needs_prep(ns, target_server)) {
      await prep(ns, target_server, workers);
    } else {
      let start = performance.now();
      const weaken_time = ns.getWeakenTime(target_server);
      let operations = create_batch_schedule(ns, target_server, workers);
      let count = 0;
      let ts = 0;
      for (const batch of operations) {
        for (const job of batch) {
          let start = performance.now();
          job();
          ts += performance.now() - start;
        }
        count++;
        if (count % 1000 === 0) {
          await ns.sleep(0);
        }
      }
      ns.exec("/shared/sleep_and_write.js", "home",
              {threads : 1, temporary : true}, weaken_time, ns.pid);
      let end = performance.now();
      ns.print(`    Spent ${ns.tFormat(ts, true)} scheduling jobs.
    Spent ${ns.tFormat(end - start, true)} overall.
    Waiting for ${ns.tFormat(weaken_time)}.`);
      await ns.nextPortWrite(ns.pid);
      ns.clearPort(ns.pid);
    }
  }
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {string[]} workers
 */
async function prep(ns, target, workers) {
  ns.tprint("ERROR: Entered prep phase, batch desync.");
  let min_security = ns.getServerMinSecurityLevel(target)
  let cur_security = ns.getServerSecurityLevel(target)
  let num_weakens = Math.ceil((cur_security - min_security) / 0.05)
  if (num_weakens > 0) {
    let server = target
    let weaken_time = ns.getWeakenTime(server)
    // Sometimes floating point errors make it be off by some absurdly small
    // amount
    num_weakens++;
    for (let worker of workers.map((w) => w).sort(
             (a, b) => GetThreadCount(ns, a) - GetThreadCount(ns, b))) {
      if (num_weakens <= 0) {
        break
      }
      let thread_count = GetThreadCount(ns, worker)
      if (thread_count <= 0) {
        continue
      }
      let t = Math.min(num_weakens, thread_count)
      ns.printf("Weakening %s", server)
      ns.exec("/shared/weaken.js", worker, {threads : t, temporary : true},
              server)
      num_weakens -= t
    }
  }
  let num_worker_threads = 0;
  for (let worker of workers) {
    num_worker_threads += GetThreadCount(ns, worker);
  }
  const server = target
  let growth_threads = ns.formulas.hacking.growThreads(
      ns.getServer(server), ns.getPlayer(), Number.POSITIVE_INFINITY);
  let weaken_threads = Math.ceil(growth_threads * WEAKEN_PER_GROW)
  let weaken_time = ns.getWeakenTime(server)
  ns.print(`Expected grow threads required: ${growth_threads}`);
  if (num_worker_threads < growth_threads + weaken_threads) {
    let growth_ratio = growth_threads / (weaken_threads + growth_threads);
    growth_threads = Math.floor(num_worker_threads * growth_ratio) - 1;
    weaken_threads = Math.ceil(growth_threads * WEAKEN_PER_GROW) + 1;
  }
  ns.print(`Actual grow threads used: ${growth_threads}`);
  for (let w of workers
           .map(
               w => {return { worker: w, thread_count: GetThreadCount(ns, w) }})
           .sort((a, b) => a.thread_count - b.thread_count)
           .reverse()) {
    if (growth_threads <= 0) {
      break
    }
    let worker = w.worker
    let threads = w.thread_count
    let t = Math.min(growth_threads, threads)
    if (t <= 0) {
      break;
    }
    ns.exec("/shared/grow.js", worker, {threads : t, temporary : true}, server)
    growth_threads -= t
  }
  for (let worker of workers.map((w) => w).sort(
           (a, b) => GetThreadCount(ns, a) - GetThreadCount(ns, b))) {
    let threads = GetThreadCount(ns, worker)
    if (threads <= 0) {
      continue
    }
    if (weaken_threads <= 0) {
      break
    }
    let t = Math.min(weaken_threads, threads)
    ns.exec("/shared/weaken.js", worker, {threads : t, temporary : true},
            server)
    weaken_threads -= t
  }
  ns.print("Sleeping after grow+weaken")
      await sleep(ns, weaken_time + WAIT_TIME, workers)
}

/**
 * @param {NS} ns
 */
function needs_prep(ns, target) {
  return ns.getServerSecurityLevel(target) >
             ns.getServerMinSecurityLevel(target) + 0.001 ||
         ns.getServerMoneyAvailable(target) + Number.EPSILON <
             ns.getServerMaxMoney(target)
}

/**
 * @param {NS} ns
 * @param {string} target_server
 * @param {string[]} workers
 */
function create_batch_schedule(ns, target_server, workers) {
  // Going to make an extreme simplifying assumption that the selected batch
  // size does fit on every available server, instead of solving the knapsack
  // problem to find the real optimal answer.

  let worker_objects =
      workers
          .map(w => {
            let wo = ns.getServer(w);
            wo.availableRam =
                wo.maxRam - wo.ramUsed - (wo.hostname === "home" ? 20 : 0);
            wo.numThreads = GetThreadCount(ns, wo.hostname);
            wo.resetValue = wo.numThreads;
            return wo;
          })
          .sort((a, b) => b.availableRam - a.availableRam);
  let num_worker_threads =
      worker_objects.map(wo => wo.numThreads).reduce((x, y) => x + y);
  let player = ns.getPlayer();
  let so = ns.getServer(target_server);
  let timer_start = performance.now();
  let amount_hacked = ns.formulas.hacking.hackPercent(so, player);
  let estimated_incomes = [];
  let bonus_filler = [];
  for (let i = 1; i <= 1024 * 4; i++) {
    // if (amount_hacked * i > 0.99) {
    //   debugger;
    //   break;
    // }
    let tmp_so = {...so};
    tmp_so.moneyAvailable -= Math.min(amount_hacked * i, 1) * tmp_so.moneyMax;
    tmp_so.hackDifficulty += i * 0.002;
    let gt = ns.formulas.hacking.growThreads(tmp_so, player, tmp_so.moneyMax);
    let phwt = Math.ceil(i * WEAKEN_PER_HACK);
    let pgwt = Math.ceil(gt * WEAKEN_PER_GROW);
    let wt = Math.ceil(i * WEAKEN_PER_HACK + gt * WEAKEN_PER_GROW);
    let tt = i + gt + wt;
    if (tt > num_worker_threads) {
      break;
    }
    // if (Math.floor(num_worker_threads / tt) > BATCH_LIMIT) {
    //   continue;
    // }

    let expected_income =
        (Math.min(amount_hacked * i, 1) * tmp_so.moneyMax) / tt;
    let ret = {
      hack_threads : i,
      post_hack_weaken_threads : phwt,
      grow_threads : gt,
      post_grow_weaken_threads : pgwt,
      estimated_income : expected_income,
      total_threads : tt,
      weaken_threads : wt,
    };
    if (Math.floor(num_worker_threads / tt) > BATCH_LIMIT) {
      bonus_filler.push(ret);
    } else {
      estimated_incomes.push(ret);
    }
  }
  ns.print(`Took ${
      ns.tFormat(performance.now() - timer_start,
                 true)} to estimate best batch size.`);
  // Sorted from worst to best so that pop() has constant time access to the
  // best element
  debugger;
  let ts = performance.now();
  let batch_infos = [...bonus_filler ]
                        .sort((a, b) => a.estimated_income - b.estimated_income)
                        .concat([...estimated_incomes ].sort(
                            (a, b) => a.estimated_income - b.estimated_income));
  batch_infos = batch_infos.filter(
      b => b.hack_threads <= batch_infos[batch_infos.length - 1].hack_threads);

  if (batch_infos[batch_infos.length - 1].hack_threads * amount_hacked >= 1) {
    let hack_threads = Math.floor(1 / amount_hacked);
    let tmp_so = {...so};
    tmp_so.moneyAvailable -= hack_threads * amount_hacked * tmp_so.moneyMax;
    tmp_so.hackDifficulty += hack_threads * 0.002;
    let grow_threads =
        ns.formulas.hacking.growThreads(tmp_so, player, tmp_so.moneyMax);
    let weaken_threads = Math.ceil(hack_threads * WEAKEN_PER_HACK +
                                   grow_threads * WEAKEN_PER_GROW);
    let tt = hack_threads + grow_threads + weaken_threads;
    batch_infos = [ {
      hack_threads : hack_threads,
      grow_threads : grow_threads,
      total_threads : tt,
      weaken_threads : weaken_threads,
      estimated_income : (amount_hacked * hack_threads * tmp_so.moneyMax) / tt,
    } ];
  }

  /** @type {MinMaxQueue} */
  worker_objects = new MinMaxQueue(workers.map(w => {
    let wo = ns.getServer(w);
    wo.availableRam =
        wo.maxRam - wo.ramUsed - (wo.hostname === "home" ? 20 : 0);
    wo.numThreads = GetThreadCount(ns, wo.hostname);
    return wo;
  }),
                                   (a, b) => a.numThreads - b.numThreads);

  const grow_time = ns.getGrowTime(target_server);
  const hack_time = ns.getHackTime(target_server);
  const weaken_time = ns.getWeakenTime(target_server);
  const grow_delay = weaken_time - grow_time;
  const hack_delay = weaken_time - hack_time;

  let batch_info = batch_infos.pop();
  let operations = [];
  let batch_hacked = 0;
  let count = 0;
  debugger;
  while (num_worker_threads > 0 && !worker_objects.is_empty()) {
    while (batch_infos.length > 0 &&
           (batch_info.total_threads > num_worker_threads ||
            batch_info.hack_threads > worker_objects.peek_last().numThreads ||
            batch_info.grow_threads > worker_objects.peek_last().numThreads)) {
      batch_info = batch_infos.pop();
    }
    if ((batch_info.total_threads > num_worker_threads ||
         batch_info.hack_threads > worker_objects.peek_last().numThreads ||
         batch_info.grow_threads > worker_objects.peek_last().numThreads) &&
        batch_infos.length === 0) {
      break;
    }

    let batch = [];
    let tmp_so = {...so};
    let tmp_player = {...player};

    // Hack
    let hack_worker = worker_objects.pop_last();
    if (hack_worker.numThreads < batch_info.hack_threads) {
      worker_objects.push(hack_worker);
      if (batch_infos.length > 0) {
        batch_info = batch_infos.pop();
      } else {
        break;
      }
      continue;
    }
    let hack_threads = batch_info.hack_threads;
    hack_worker.numThreads -= hack_threads;
    num_worker_threads -= hack_threads;
    if (hack_worker.numThreads !== 0) {
      worker_objects.push(hack_worker);
    }
    let hack_amount = ns.formulas.hacking.hackPercent(tmp_so, tmp_player) *
                      hack_threads * tmp_so.moneyMax;
    tmp_so.hackDifficulty += 0.002 * hack_threads;
    tmp_so.moneyAvailable -= hack_amount;
    tmp_player.exp.hacking +=
        ns.formulas.hacking.hackExp(tmp_so, tmp_player) * hack_threads;
    tmp_player.skills.hacking = ns.formulas.skills.calculateSkill(
        tmp_player.exp.hacking, tmp_player.mults.hacking);

    batch.push(() => {
      ns.exec("/shared/hack.js", hack_worker.hostname,
              {threads : hack_threads, temporary : true}, target_server,
              JSON.stringify({wait_time : hack_delay}));
    });

    // Grow
    let grow_worker = worker_objects.pop_last();
    // recalculate grow threads....
    let grow_threads =
        ns.formulas.hacking.growThreads(tmp_so, tmp_player, tmp_so.moneyMax);
    if (grow_worker.numThreads < grow_threads) {
      worker_objects.push(grow_worker);
      // Crimes against encapsulation follow
      num_worker_threads += hack_threads;
      hack_worker.numThreads += hack_threads;
      if (!worker_objects.includes(hack_worker)) {
        worker_objects.push(hack_worker);
      } else {
        worker_objects._build_heap();
      }
      if (batch_infos.length > 0) {
        batch_info = batch_infos.pop();
      } else {
        break;
      }
      continue;
    }
    grow_worker.numThreads -= grow_threads;
    num_worker_threads -= grow_threads;
    if (grow_worker.numThreads !== 0) {
      worker_objects.push(grow_worker);
    }
    tmp_player.exp.hacking +=
        ns.formulas.hacking.hackExp(tmp_so, tmp_player) * grow_threads;
    tmp_player.skills.hacking = ns.formulas.skills.calculateSkill(
        tmp_player.exp.hacking, tmp_player.mults.hacking);

    batch.push(() => {
      ns.exec("/shared/grow.js", grow_worker.hostname,
              {threads : grow_threads, temporary : true}, target_server,
              JSON.stringify({wait_time : grow_delay}));
    });

    // Weaken
    let weaken_threads = Math.ceil(hack_threads * WEAKEN_PER_HACK +
                                   grow_threads * WEAKEN_PER_GROW);
    if (weaken_threads > num_worker_threads) {
      grow_worker.numThreads += grow_threads;
      num_worker_threads += grow_threads;
      // Crimes against encapsulation follow
      if (!worker_objects.includes(grow_worker)) {
        worker_objects.push(grow_worker);
      }
      num_worker_threads += hack_threads;
      hack_worker.numThreads += hack_threads;
      if (!worker_objects.includes(hack_worker)) {
        worker_objects.push(hack_worker);
      }
      worker_objects._build_heap();
      if (batch_infos.length > 0) {
        batch_info = batch_infos.pop();
      } else {
        break;
      }
      continue;
    }
    do {
      let worker = worker_objects.pop();
      let t = Math.min(worker.numThreads, weaken_threads);
      worker.numThreads -= t;
      num_worker_threads -= t;
      weaken_threads -= t;
      if (worker.numThreads !== 0) {
        worker_objects.push(worker);
      }
      tmp_player.exp.hacking +=
          ns.formulas.hacking.hackExp(tmp_so, tmp_player) * t;
      tmp_player.skills.hacking = ns.formulas.skills.calculateSkill(
          tmp_player.exp.hacking, tmp_player.mults.hacking);
      batch.push(() => {
        ns.exec("/shared/weaken.js", worker.hostname,
                {threads : t, temporary : true}, target_server);
      });
    } while (weaken_threads > 0);
    player = tmp_player;
    count++;

    operations.push(batch);
    batch_hacked += hack_amount;
    if (count === BATCH_LIMIT) {
      break;
    }
  }
  ns.print(`Post hack information:
    \$${ns.formatNumber(batch_hacked)}
    \$ / sec: \$${ns.formatNumber(batch_hacked / (weaken_time / 1_000))}
    Total batches scheduled: ${count}
    Time spent computing batches ${ns.tFormat(performance.now() - ts, true)}.`);
  return operations;
}
