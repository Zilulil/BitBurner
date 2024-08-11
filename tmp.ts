/**
 * @param {NS} ns
 */
export async function main(ns: NS) {
  let player = ns.getPlayer();
  for (const key in ns.enums.GymType) {
    const stat = ns.enums.GymType[key];
    do {
      player = ns.getPlayer();
      ns.singularity.gymWorkout("Powerhouse Gym", stat, false);
      await ns.sleep(1000);
    } while (player.skills[key] < 100);
  }
  ns.singularity.commitCrime("Mug");
}
