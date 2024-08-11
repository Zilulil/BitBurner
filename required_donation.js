/**
 * @param {NS} ns
 */
export async function main(ns) {
  let donation_amount = ns.args[0] * 1e6 / ns.getPlayer().mults.faction_rep /
                        ns.getBitNodeMultipliers().FactionWorkRepGain;
  ns.tprint(donation_amount);
}
