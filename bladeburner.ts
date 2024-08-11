
export async function main(ns: NS) {
  while (true) {
    const [stam, max_stam] = ns.bladeburner.getStamina();
    const contract = "Tracking";
    if (ns.bladeburner.getCityChaos("Sector-12") > 50) {
      const time = ns.bladeburner.getActionTime("general", "Diplomacy");
      ns.bladeburner.startAction("general", "Diplomacy");
      await ns.sleep(time);
    } else if (stam > max_stam / 2) {
      if (ns.bladeburner.getActionCountRemaining("contract", contract) >= 1) {
        const time = ns.bladeburner.getActionTime("contract", contract);
        ns.bladeburner.startAction("contract", contract);
        await ns.sleep(time);
      } else if (ns.bladeburner.getActionCountRemaining("contract",
                                                        "Retirement") >= 1) {
        const time = ns.bladeburner.getActionTime("contract", "Retirement");
        ns.bladeburner.startAction("contract", "Retirement");
        await ns.sleep(time);
      } else {
        const time = ns.bladeburner.getActionTime("general", "Field Analysis");
        ns.bladeburner.startAction("general", "Field Analysis");
        await ns.sleep(time);
      }
    } else {
      const time = ns.bladeburner.getActionTime(
          "general", "Hyperbolic Regeneration Chamber");
      ns.bladeburner.startAction("general", "Hyperbolic Regeneration Chamber");
      await ns.sleep(time);
    }
  }
}
