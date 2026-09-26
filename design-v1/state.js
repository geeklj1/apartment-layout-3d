(() => {
  const key='apartment-design-v1-state';
  let saved=null;
  try { saved=JSON.parse(localStorage.getItem(key)||'null'); } catch (_) {}
  window.openai={
    widgetState:saved,
    async setWidgetState(next){
      if(!next||typeof next!=='object'||Array.isArray(next))throw new TypeError('Invalid viewer state');
      const encoded=JSON.stringify(next);
      if(encoded.length>16384)throw new RangeError('Viewer state too large');
      window.openai.widgetState=JSON.parse(encoded);
      try { localStorage.setItem(key,encoded); } catch (_) {}
    }
  };
})();
