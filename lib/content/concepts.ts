export type ConceptNode = {
  id: string;
  subject: "math" | "science" | "ela" | "religion";
  titleKid: string;
  titleAdmin: string;
  standardCodes: string[];
  milestoneLevel: number;
  kind: "skill" | "fact_set" | "vocab" | "reading_skill" | "knowledge" | "prayer";
  efficientStrategies?: string[];
};

export const MATH_CONCEPTS: ConceptNode[] = [
  { id: "math.nbt.pv_3digit", subject: "math", titleKid: "Hundreds, tens, and ones", titleAdmin: "3-digit place value", standardCodes: ["OH.2.NBT.1"], milestoneLevel: 2.3, kind: "skill" },
  { id: "math.oa.add_sub_20_fluency", subject: "math", titleKid: "Add and subtract within 20", titleAdmin: "Fluency within 20", standardCodes: ["OH.2.OA.2"], milestoneLevel: 2.2, kind: "fact_set", efficientStrategies: ["known_fact", "decomposition_tens"] },
  { id: "math.nbt.add_sub_100", subject: "math", titleKid: "Add and subtract within 100", titleAdmin: "Add/sub within 100", standardCodes: ["OH.2.NBT.5"], milestoneLevel: 2.6, kind: "skill", efficientStrategies: ["decomposition_tens", "standard_algorithm"] },
  { id: "math.nbt.pv_ten_times", subject: "math", titleKid: "A digit is ten times the place to its right", titleAdmin: "10 times place value", standardCodes: ["OH.4.NBT.1"], milestoneLevel: 4.1, kind: "skill" },
  { id: "math.nbt.read_write_compare_1m", subject: "math", titleKid: "Read, write, and compare big numbers", titleAdmin: "Read/write/compare to 1,000,000", standardCodes: ["OH.4.NBT.2"], milestoneLevel: 4.1, kind: "skill" },
  { id: "math.nbt.round_any_place_1m", subject: "math", titleKid: "Round big numbers", titleAdmin: "Round multi-digit numbers", standardCodes: ["OH.4.NBT.3"], milestoneLevel: 4.2, kind: "skill" },
  { id: "math.nbt.add_sub_std_alg_1m", subject: "math", titleKid: "Add and subtract the standard way", titleAdmin: "Standard algorithm add/sub", standardCodes: ["OH.4.NBT.4"], milestoneLevel: 4.2, kind: "skill", efficientStrategies: ["standard_algorithm", "decomposition_tens"] },
  { id: "math.nbt.mult_4x1_place_value", subject: "math", titleKid: "Multiply with boxes and place value", titleAdmin: "4x1 multiplication", standardCodes: ["OH.4.NBT.5"], milestoneLevel: 4.4, kind: "skill", efficientStrategies: ["partial_products_area_model", "distributive_fact_split"] },
  { id: "math.nbt.mult_2x2_area_model", subject: "math", titleKid: "Multiply big numbers with boxes", titleAdmin: "2x2 area model", standardCodes: ["OH.4.NBT.5"], milestoneLevel: 4.5, kind: "skill", efficientStrategies: ["partial_products_area_model", "standard_algorithm"] },
  { id: "math.nbt.div_4by1_partial_quotients", subject: "math", titleKid: "Divide with friendly jumps", titleAdmin: "Partial quotients", standardCodes: ["OH.4.NBT.6"], milestoneLevel: 4.6, kind: "skill", efficientStrategies: ["partial_quotients", "related_multiplication"] },
  { id: "math.oa.multiplicative_comparison", subject: "math", titleKid: "Times as many", titleAdmin: "Multiplicative comparison", standardCodes: ["OH.4.OA.1", "OH.4.OA.2"], milestoneLevel: 4.2, kind: "skill" },
  { id: "math.nf.equivalence_n_times", subject: "math", titleKid: "Same amount, new pieces", titleAdmin: "Equivalent fractions", standardCodes: ["OH.4.NF.1"], milestoneLevel: 4.2, kind: "skill" },
  { id: "math.nf.compare_unlike", subject: "math", titleKid: "Compare different-size pieces", titleAdmin: "Compare unlike fractions", standardCodes: ["OH.4.NF.2"], milestoneLevel: 4.3, kind: "skill" },
  { id: "math.nf.add_sub_like_denoms", subject: "math", titleKid: "Add and subtract same-size pieces", titleAdmin: "Add/sub like denominators", standardCodes: ["OH.4.NF.3c"], milestoneLevel: 4.4, kind: "skill" },
  { id: "math.md.metric_relative_convert", subject: "math", titleKid: "Metric hops", titleAdmin: "Metric convert", standardCodes: ["OH.4.MD.1"], milestoneLevel: 4.3, kind: "skill" },
  { id: "ela.read.evidence_tap", subject: "ela", titleKid: "Tap the proving sentence", titleAdmin: "Evidence tap", standardCodes: [], milestoneLevel: 4.0, kind: "reading_skill" },
  { id: "ela.read.sequence", subject: "ela", titleKid: "Put the story in order", titleAdmin: "Sequence", standardCodes: [], milestoneLevel: 4.0, kind: "reading_skill" },
  { id: "ela.read.cause_effect", subject: "ela", titleKid: "Why did that happen?", titleAdmin: "Cause and effect", standardCodes: [], milestoneLevel: 4.0, kind: "reading_skill" },
];

export const HARD_PREREQS: Array<{ from: string; to: string }> = [
  { from: "math.nbt.pv_3digit", to: "math.nbt.pv_ten_times" },
  { from: "math.nbt.pv_ten_times", to: "math.nbt.read_write_compare_1m" },
  { from: "math.nbt.read_write_compare_1m", to: "math.nbt.round_any_place_1m" },
  { from: "math.nbt.mult_4x1_place_value", to: "math.nbt.mult_2x2_area_model" },
  { from: "math.nf.equivalence_n_times", to: "math.nf.compare_unlike" },
  { from: "ela.read.evidence_tap", to: "ela.read.cause_effect" },
];
