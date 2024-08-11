// servers/home/control.js
var SCRIPT_RAM = 1.75;
var DIFFICULTY_PER_HACK = 2e-3;
var DIFFICULTY_PER_GROW = 4e-3;
var WEAKEN_PER_GROW = DIFFICULTY_PER_GROW / 0.05;
var WEAKEN_PER_HACK = DIFFICULTY_PER_HACK / 0.05;
var WAIT_TIME = 100;
function GetThreadCount(ns, worker, ram = SCRIPT_RAM) {
  let used_ram = worker != "home" ? ns.getServerUsedRam(worker) : ns.getServerUsedRam(worker) + 20;
  used_ram = Math.min(ns.getServerMaxRam(worker), used_ram);
  return Math.floor((ns.getServerMaxRam(worker) - used_ram) / ram);
}
function find_best_server(ns, servers) {
  let target_server = servers.map(
    (s) => {
      return { server: s, ratio: get_ratio_for_server(ns, s) };
    }
  ).sort((a, b) => a.ratio - b.ratio).reverse()[0].server;
  ns.print(target_server, " selected");
  return target_server;
}
function get_ratio_for_server(ns, server) {
  let player = ns.getPlayer();
  let so = ns.getServer(server);
  so.hackDifficulty = so.minDifficulty;
  if (so.requiredHackingSkill > player.skills.hacking) {
    return 0;
  }
  let weight = so.moneyMax / ns.formulas.hacking.weakenTime(so, player) * ns.formulas.hacking.hackChance(so, player);
  return weight;
}
async function sleep(ns, duration, workers) {
  const share_duration = 10 * 1e3 + WAIT_TIME;
  ns.printf("Sleeping for %s", ns.tFormat(duration));
  while (duration >= share_duration + WAIT_TIME) {
    for (let worker of workers) {
      let thread_count = GetThreadCount(ns, worker, 4);
      if (thread_count <= 0) {
        continue;
      }
      ns.exec(
        "/shared/share.js",
        worker,
        { threads: thread_count, temporary: true }
      );
    }
    await ns.sleep(share_duration);
    duration -= share_duration;
  }
  await ns.sleep(duration);
}
async function main(ns) {
  ns.clearPort(1);
  ns.disableLog("ALL");
  ns.tail();
  while (true) {
    ns.print("Finding servers");
    let tmp = ns.read("/valid_servers.txt");
    let servers = tmp.split(",");
    let target_server = ns.args[0] || find_best_server(ns, servers);
    let workers = servers.filter((server) => ns.hasRootAccess(server) && ns.getServerMaxRam(server) != 0).sort((a, b) => GetThreadCount(ns, b) - GetThreadCount(ns, a));
    if (needs_prep(ns, target_server)) {
      await prep(ns, target_server, workers, servers);
    } else {
      let start = Date.now();
      let count = 0;
      const weaken_time = ns.getWeakenTime(target_server);
      let batch_hacked = 0;
      let player = ns.getPlayer();
      let so = ns.getServer(target_server);
      let amount_hacked = ns.formulas.hacking.hackPercent(so, player);
      let weaken_tasks = 0;
      let time_searching = 0;
      let time_sorting = 0;
      let time_func = 0;
      let time_copying = 0;
      let time_scheduling = 0;
      while (true) {
        let worker_objects = workers.map((w) => {
          let wo = ns.getServer(w);
          wo.availableRam = wo.maxRam - wo.ramUsed - wo.hostname === "home" ? 20 : 0;
          wo.numThreads = GetThreadCount(ns, wo.hostname);
          wo.resetValue = wo.numThreads;
          return wo;
        }).sort((a, b) => b.availableRam - a.availableRam);
        let num_worker_threads = worker_objects.map((wo) => wo.numThreads).reduce((x, y) => x + y);
        let hack_threads = 0;
        let post_hack_weaken_threads = 0;
        let grow_threads = 0;
        let post_grow_weaken_threads = 0;
        let weaken_threads = 0;
        let total_threads = 0;
        let inner_player = { ...player };
        let inner_so = { ...so };
        let timer_start = performance.now();
        for (let i = 1; i <= 1024; i++) {
          let ts2 = performance.now();
          let tmp_so = { ...inner_so };
          let tmp_player = { ...inner_player };
          time_copying += performance.now() - ts2;
          ts2 = performance.now();
          let amount_hacked2 = ns.formulas.hacking.hackPercent(tmp_so, tmp_player);
          time_func += performance.now() - ts2;
          ts2 = performance.now();
          let best = worker_objects.sort((a, b) => b.numThreads - a.numThreads)[0];
          time_sorting += performance.now() - ts2;
          if (i * amount_hacked2 > 0.99) {
            break;
          }
          let phwt = Math.ceil(i * WEAKEN_PER_HACK);
          let gt;
          ts2 = performance.now();
          tmp_player.exp.hacking += ns.formulas.hacking.hackExp(tmp_so, tmp_player) * i;
          tmp_player.exp.hacking += ns.formulas.hacking.hackExp(tmp_so, tmp_player) * phwt;
          tmp_so.moneyAvailable -= amount_hacked2 * i * so.moneyMax;
          tmp_player.skills.hacking = ns.formulas.skills.calculateSkill(
            tmp_player.exp.hacking,
            tmp_player.mults.hacking
          );
          gt = ns.formulas.hacking.growThreads(
            tmp_so,
            tmp_player,
            tmp_so.moneyMax
          );
          tmp_player.exp.hacking += ns.formulas.hacking.hackExp(tmp_so, tmp_player) * gt;
          tmp_player.skills.hacking = ns.formulas.skills.calculateSkill(
            tmp_player.exp.hacking,
            tmp_player.mults.hacking
          );
          time_func += performance.now() - ts2;
          if (gt > best.numThreads) {
            break;
          }
          best.numThreads -= gt;
          ts2 = performance.now();
          best = worker_objects.sort((a, b) => b.numThreads - a.numThreads)[0];
          time_sorting += performance.now() - ts2;
          if (i > best.numThreads) {
            break;
          }
          let pgwt = Math.ceil(gt * WEAKEN_PER_GROW);
          let wt = Math.ceil(gt * WEAKEN_PER_GROW + i * WEAKEN_PER_HACK);
          let tt = gt + i + phwt + pgwt;
          if (tt > num_worker_threads) {
            break;
          }
          ts2 = performance.now();
          tmp_player.exp.hacking += ns.formulas.hacking.hackExp(tmp_so, tmp_player) * pgwt;
          tmp_player.skills.hacking = ns.formulas.skills.calculateSkill(
            tmp_player.exp.hacking,
            tmp_player.mults.hacking
          );
          tmp_so.moneyAvailable = tmp_so.moneyMax;
          tmp_so.hackDifficulty = tmp_so.minDifficulty;
          time_func += performance.now() - ts2;
          player = tmp_player;
          so = tmp_so;
          total_threads = tt;
          hack_threads = i;
          post_hack_weaken_threads = phwt;
          grow_threads = gt;
          weaken_threads = wt;
          post_grow_weaken_threads = pgwt;
          ts2 = performance.now();
          worker_objects = worker_objects.map((wo) => {
            wo.numThreads = wo.resetValue;
            return wo;
          });
          time_copying += performance.now() - ts2;
        }
        time_searching += performance.now() - timer_start;
        if (total_threads === 0) {
          ns.print(`Scheduled ${count} batches.`);
          break;
        }
        const grow_time = ns.getGrowTime(target_server);
        const hack_time = ns.getHackTime(target_server);
        const grow_delay = weaken_time - grow_time;
        const hack_delay = weaken_time - hack_time;
        workers = workers.sort((a, b) => GetThreadCount(ns, a) - GetThreadCount(ns, b));
        let ts = performance.now();
        let hack_worker = null;
        for (let worker of workers) {
          if (GetThreadCount(ns, worker) >= hack_threads) {
            hack_worker = worker;
            break;
          }
        }
        if (hack_worker === null) {
          ns.print(`Scheduled ${count} batches.`);
          break;
        }
        let threads = GetThreadCount(ns, hack_worker);
        let t = Math.min(threads, hack_threads);
        ns.exec(
          "/shared/hack.js",
          hack_worker,
          { threads: t, temporary: true },
          target_server,
          JSON.stringify({ wait_time: hack_delay })
        );
        batch_hacked += amount_hacked * hack_threads * ns.getServerMaxMoney(target_server);
        for (let worker of workers) {
          threads = GetThreadCount(ns, worker);
          if (post_hack_weaken_threads === 0) {
            break;
          }
          if (threads === 0) {
            continue;
          }
          t = Math.min(threads, post_hack_weaken_threads);
          ns.exec(
            "/shared/weaken.js",
            worker,
            { threads: t, temporary: true },
            target_server
          );
          post_hack_weaken_threads -= t;
        }
        let grow_worker = null;
        for (let worker of workers) {
          if (GetThreadCount(ns, worker) >= grow_threads) {
            grow_worker = worker;
            break;
          }
        }
        if (grow_worker === null) {
          ns.print(`Scheduled ${count} batches.`);
          break;
        }
        threads = GetThreadCount(ns, grow_worker);
        if (grow_threads > threads) {
          ns.print(`ERROR: Expected server with ${grow_threads}, received ${threads}`);
        }
        t = Math.min(threads, grow_threads);
        ns.exec(
          "/shared/grow.js",
          grow_worker,
          { threads: t, temporary: true },
          target_server,
          JSON.stringify({ wait_time: grow_delay })
        );
        for (let worker of workers) {
          threads = GetThreadCount(ns, worker);
          if (post_grow_weaken_threads === 0) {
            break;
          }
          if (threads === 0) {
            continue;
          }
          t = Math.min(threads, post_grow_weaken_threads);
          ns.exec(
            "/shared/weaken.js",
            worker,
            { threads: t, temporary: true },
            target_server,
            JSON.stringify({ port: 1 })
          );
          post_grow_weaken_threads -= t;
          weaken_tasks++;
        }
        time_scheduling += performance.now() - ts;
        player = inner_player;
        so = inner_so;
        count++;
        if (count % 200 === 0) {
          await ns.sleep(0);
        }
      }
      let end = Date.now();
      ns.print(`Post hack information:
      $${ns.formatNumber(batch_hacked)}
      $ / sec: $${ns.formatNumber(batch_hacked / (weaken_time / 1e3))}
      Total time taken to schedule batches: ${ns.tFormat(end - start)}
      Time spent scheduling jobs: ${ns.tFormat(time_scheduling, true)}
      Time spent finding batch size: ${ns.tFormat(time_searching)}
      Time sorting: ${ns.tFormat(time_sorting, true)}
      Time spent calling analysis functions: ${ns.tFormat(time_func, true)}
      Time spent copying objects: ${ns.tFormat(time_copying, true)}
      Average time per batch taken to schedule: ${(end - start) / count}ms
      Waiting for an expected ${ns.tFormat(weaken_time)}`);
      while (weaken_tasks > 0) {
        await ns.nextPortWrite(1);
        ns.readPort(1);
        weaken_tasks--;
      }
      await ns.sleep(0);
    }
  }
}
async function prep(ns, target, workers, allServers) {
  ns.tprint("ERROR: Entered prep phase, batch desync.");
  let min_security = ns.getServerMinSecurityLevel(target);
  let cur_security = ns.getServerSecurityLevel(target);
  let num_weakens = Math.ceil((cur_security - min_security) / 0.05);
  if (num_weakens > 0) {
    let server = target;
    let weaken_time = ns.getWeakenTime(server);
    num_weakens++;
    for (let worker of workers.map((w) => w).sort(
      (a, b) => GetThreadCount(ns, a) - GetThreadCount(ns, b)
    )) {
      if (num_weakens <= 0) {
        break;
      }
      let thread_count = GetThreadCount(ns, worker);
      if (thread_count <= 0) {
        continue;
      }
      let t = Math.min(num_weakens, thread_count);
      ns.printf("Weakening %s", server);
      ns.exec(
        "/shared/weaken.js",
        worker,
        { threads: t, temporary: true },
        server
      );
      num_weakens -= t;
    }
    ns.print(`Sleeping after prep weaken, Expected ${num_weakens} remaining`);
    await sleep(ns, weaken_time + WAIT_TIME, workers);
    ns.print(`Actual security: ${ns.getServerSecurityLevel(server)}. Expected security: ${ns.getServerMinSecurityLevel(server)}`);
  } else {
    let num_worker_threads = 0;
    for (let worker of workers) {
      num_worker_threads += GetThreadCount(ns, worker);
    }
    const server = target;
    let growth_requirement = ns.getServerMaxMoney(server) / ns.getServerMoneyAvailable(server);
    let growth_threads;
    debugger;
    if (growth_requirement === Number.POSITIVE_INFINITY) {
      growth_threads = Math.floor(num_worker_threads / (1 + WEAKEN_PER_GROW));
    } else {
      growth_threads = Math.ceil(ns.growthAnalyze(server, growth_requirement) * 1.12);
    }
    let weaken_threads = Math.ceil(growth_threads * WEAKEN_PER_GROW);
    let weaken_time = ns.getWeakenTime(server);
    ns.print(`Expected grow threads required: ${growth_threads}`);
    if (num_worker_threads < growth_threads + weaken_threads) {
      let growth_ratio = growth_threads / (weaken_threads + growth_threads);
      growth_threads = Math.floor(num_worker_threads * growth_ratio) - 1;
      weaken_threads = Math.ceil(growth_threads * WEAKEN_PER_GROW) + 1;
    }
    ns.print(`Actual grow threads used: ${growth_threads}`);
    for (let w of workers.map((w2) => {
      return { worker: w2, thread_count: GetThreadCount(ns, w2) };
    }).sort((a, b) => a.thread_count - b.thread_count).reverse()) {
      if (growth_threads <= 0) {
        break;
      }
      let worker = w.worker;
      let threads = w.thread_count;
      let t = Math.min(growth_threads, threads);
      if (t <= 0) {
        break;
      }
      ns.exec(
        "/shared/grow.js",
        worker,
        { threads: t, temporary: true },
        server
      );
      growth_threads -= t;
    }
    for (let worker of workers.map((w) => w).sort(
      (a, b) => GetThreadCount(ns, a) - GetThreadCount(ns, b)
    )) {
      let threads = GetThreadCount(ns, worker);
      if (threads <= 0) {
        continue;
      }
      if (weaken_threads <= 0) {
        break;
      }
      let t = Math.min(weaken_threads, threads);
      ns.exec(
        "/shared/weaken.js",
        worker,
        { threads: t, temporary: true },
        server
      );
      weaken_threads -= t;
    }
    ns.print("Sleeping after grow+weaken");
    await sleep(ns, weaken_time + WAIT_TIME, workers);
  }
}
function needs_prep(ns, target) {
  return ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 1e-3 || ns.getServerMoneyAvailable(target) + Number.EPSILON < ns.getServerMaxMoney(target);
}
export {
  main
};
