export function createOrganizationController(storage) {
 let organizations=[],selectedId=null;
 return {
  view:()=>({organizations:organizations.map(({id,name})=>({id,name})),selectedId}),
  async resolve(raw){
   if(!Array.isArray(raw))throw Error('structure');
   organizations=raw.filter(o=>typeof o?.uuid==='string'&&o.uuid).map(o=>({id:o.uuid,name:typeof o.name==='string'&&o.name.trim()?o.name:o.uuid}));
   if(!organizations.length)throw Error('structure');
   const saved=await storage.get(['claudeOrganizationId','claudeEffectiveOrganizationId','quotaState','dailyBudget','resetLog']);
   selectedId=organizations.find(o=>o.id===saved.claudeOrganizationId)?.id??organizations[0].id;
   const changes={claudeOrganizationId:selectedId,claudeEffectiveOrganizationId:selectedId};
   // Legacy readings have no organization identity and must not be mixed with a new selection.
   if(saved.claudeEffectiveOrganizationId!==selectedId){
    const quotaState={...saved.quotaState},dailyBudget={...saved.dailyBudget};delete quotaState.claude;delete dailyBudget.claude;
    changes.quotaState=quotaState;changes.dailyBudget=dailyBudget;
    changes.resetLog={snapshots:(saved.resetLog?.snapshots??[]).filter(s=>s.provider!=='claude'),events:(saved.resetLog?.events??[]).filter(e=>e.provider!=='claude')};
   }
   await storage.set(changes);return selectedId;
  },
  async select(id){if(!organizations.some(o=>o.id===id))throw Error('Unknown organization');await storage.set({claudeOrganizationId:id});}
 };
}
