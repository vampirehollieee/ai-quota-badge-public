export function createThemeController({read,write,systemDark,apply}) {
  let preference=null;
  const effective=()=>preference??(systemDark()?'dark':'light');
  return {
    async init(){const saved=await read();preference=['light','dark'].includes(saved)?saved:null;apply(effective());},
    async toggle(){const next=effective()==='dark'?'light':'dark';await write(next);preference=next;apply(next);},
    systemChanged(){if(preference===null)apply(effective());}
  };
}
