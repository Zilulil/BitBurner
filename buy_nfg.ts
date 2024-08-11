
/**
 * @param {NS} ns
 */
export async function main(ns: NS) {
  const name = "NeuroFlux Governor";
  const faction = ns.args[0].toString();
  while (true) {
    const cost = ns.singularity.getAugmentationPrice(name);
    const required_rep = ns.singularity.getAugmentationRepReq(name);
    const cur_money = ns.getServerMoneyAvailable("home");
    if (cost > cur_money) {
      break;
    }
    const rep = ns.singularity.getFactionRep(faction);
    if (rep < required_rep) {
      let donation_amount = (required_rep - rep) * 1e6 /
                            ns.getPlayer().mults.faction_rep /
                            ns.getBitNodeMultipliers().FactionWorkRepGain;
      if (donation_amount > cur_money) {
        break;
      }
      ns.singularity.donateToFaction(faction, donation_amount);
    }
    ns.singularity.purchaseAugmentation(faction, name);
    ns.print("Purchased 1 NFG");
  }
}
