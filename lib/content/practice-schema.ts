export type PracticeCheck={kind:"quantity"; fields:{label:string; value:number; unit:string; tolerance:number}[]}|{kind:"choice"; choices:{text:string; correct:boolean; feedback:string}[]};
