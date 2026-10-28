await import('./quota-view.js');
const actions=document.querySelector('.header-actions');
const controls=document.querySelector('.controls');
const dockButton=document.querySelector('#open-dock');
if(actions&&controls&&dockButton){
  actions.insertBefore(controls,dockButton);
  const footer=document.querySelector('footer');
  // Keep the existing live error/status element, but remove the bottom controls row.
  footer.before(document.querySelector('#status'));
  footer.remove();
}
