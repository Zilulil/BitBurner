// servers/home/gang.js
async function main(ns) {
  while (true) {
    const gang_info = ns.gang.getGangInformation();
    const gang_members = ns.gang.getMemberNames().map(ns.gang.getMemberInformation);
    while (ns.gang.canRecruitMember()) {
      const name = crypto.randomUUID();
      ns.gang.recruitMember(name);
      gang_members.push(ns.gang.getMemberInformation(name));
    }
    for (const gang_member of gang_members) {
      if (ns.getServerMoneyAvailable("home") > 1e9) {
        for (const equipment of ns.gang.getEquipmentNames()) {
          if (!gang_member.upgrades.includes(equipment) && ns.gang.getEquipmentType(equipment) != "Augmentation") {
            ns.gang.purchaseEquipment(gang_member.name, equipment);
          }
        }
      }
      const terror_stats = total_terrorism_stats(gang_member);
      if (should_ascend(ns, gang_member)) {
        ns.gang.ascendMember(gang_member.name);
        ns.gang.setMemberTask(gang_member.name, "Terrorism");
      } else if (terror_stats < 630 || terror_stats > 800) {
        ns.gang.setMemberTask(gang_member.name, "Terrorism");
      } else if (terror_stats >= 630 && terror_stats <= 800) {
        ns.gang.setMemberTask(gang_member.name, "Train Combat");
      }
    }
    await ns.gang.nextUpdate();
  }
}
function total_terrorism_stats(gang_member) {
  return gang_member.hack + gang_member.str + gang_member.def + gang_member.cha + gang_member.dex;
}
function should_ascend(ns, gang_member) {
  let ascension_results = ns.gang.getAscensionResult(gang_member.name);
  return ascension_results != void 0 && (ascension_results.agi > 2 || ascension_results.cha > 2 || ascension_results.def > 2 || ascension_results.dex > 2 || ascension_results.hack > 2 || ascension_results.str > 2);
}
export {
  main
};
