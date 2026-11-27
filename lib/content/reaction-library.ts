export type PracticeReaction={label:string; category:string; reactants:readonly string[]; products:readonly string[]; coefficients:readonly number[]};
export const reactionLibrary={
  water:{label:"Hydrogen and oxygen form water",category:"Formation / combustion",reactants:["H2(g)","O2(g)"],products:["H2O(l)"],coefficients:[2,1,2]},
  iron:{label:"Iron oxidation",category:"Redox",reactants:["Fe(s)","O2(g)"],products:["Fe2O3(s)"],coefficients:[4,3,2]},
  methane:{label:"Complete combustion of methane",category:"Combustion",reactants:["CH4(g)","O2(g)"],products:["CO2(g)","H2O(g)"],coefficients:[1,2,1,2]},
  propane:{label:"Complete combustion of propane",category:"Combustion",reactants:["C3H8(g)","O2(g)"],products:["CO2(g)","H2O(g)"],coefficients:[1,5,3,4]},
  neutralisation:{label:"Hydrochloric acid and sodium hydroxide",category:"Acid–base neutralisation",reactants:["HCl(aq)","NaOH(aq)"],products:["NaCl(aq)","H2O(l)"],coefficients:[1,1,1,1]},
  sulfate:{label:"Sulfuric acid and sodium hydroxide",category:"Acid–base neutralisation",reactants:["H2SO4(aq)","NaOH(aq)"],products:["Na2SO4(aq)","H2O(l)"],coefficients:[1,2,1,2]},
  silver:{label:"Silver chloride precipitation",category:"Precipitation",reactants:["AgNO3(aq)","NaCl(aq)"],products:["AgCl(s)","NaNO3(aq)"],coefficients:[1,1,1,1]},
  carbonate:{label:"Calcium carbonate precipitation",category:"Precipitation",reactants:["CaCl2(aq)","Na2CO3(aq)"],products:["CaCO3(s)","NaCl(aq)"],coefficients:[1,1,1,2]},
  displacement:{label:"Zinc displaces copper",category:"Redox / displacement",reactants:["Zn(s)","CuSO4(aq)"],products:["ZnSO4(aq)","Cu(s)"],coefficients:[1,1,1,1]},
  decomposition:{label:"Calcium carbonate decomposition",category:"Decomposition",reactants:["CaCO3(s)"],products:["CaO(s)","CO2(g)"],coefficients:[1,1,1]},
} as const satisfies Record<string,PracticeReaction>;
export type ReactionKey=keyof typeof reactionLibrary;
export function practiceEquation(model:PracticeReaction,coefficients:readonly number[]) {
  const terms=[...model.reactants,...model.products].map((formula,index)=>`${coefficients[index]===1?"":coefficients[index]}${formula}`);
  return `${terms.slice(0,model.reactants.length).join(" + ")} -> ${terms.slice(model.reactants.length).join(" + ")}`;
}
