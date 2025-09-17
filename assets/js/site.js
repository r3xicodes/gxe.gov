document.addEventListener('DOMContentLoaded',function(){
  const year = document.getElementById('year'); if(year) year.textContent = new Date().getFullYear();
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  let siteOverlay = document.getElementById('siteOverlay');
  let overlayClose = document.getElementById('overlayClose');
  // Close overlay on Escape (listener remains; actual closeOverlay defined later with focus trapping)
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && siteOverlay && siteOverlay.getAttribute('aria-hidden')==='false') {
    // Attempt to call closeOverlay if available (defined later). If not, do a conservative hide.
    try{ if(typeof closeOverlay === 'function'){ closeOverlay(); return; } }catch(_){}
    if(siteOverlay){ siteOverlay.setAttribute('aria-hidden','true'); if(navToggle) navToggle.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
  } });
  
  /* Slideshow behavior */
  const slides = Array.from(document.querySelectorAll('.slide'));
  let current = 0;
  const slideshowStatus = document.getElementById('slideshowStatus');
  const showSlide = (i)=>{
    slides.forEach(s=>{ s.classList.remove('active'); s.setAttribute('aria-hidden','true'); });
    const idx = (i+slides.length)%slides.length;
    slides[idx].classList.add('active');
    slides[idx].setAttribute('aria-hidden','false');
    current = idx;
    try{ if(slideshowStatus) slideshowStatus.textContent = `Slide ${idx+1} of ${slides.length}: ${slides[idx].querySelector('h2') ? slides[idx].querySelector('h2').textContent : ''}`; }catch(e){}
  };
  const next = ()=> showSlide(current+1);
  const prev = ()=> showSlide(current-1);
  const nextBtn = document.getElementById('nextSlide');
  const prevBtn = document.getElementById('prevSlide');
  if(nextBtn) nextBtn.addEventListener('click', next);
  if(prevBtn) prevBtn.addEventListener('click', prev);
  // Autoplay respects the reduce-ui preference. If reduced motion is enabled, do not autoplay.
  let autoplay = null;
  function startAutoplay(){
    try{
      const reduced = localStorage.getItem('gxe_reduce_ui') === '1' || document.body.classList.contains('reduce-ui');
      if(reduced) return;
      if(autoplay) clearInterval(autoplay);
      autoplay = setInterval(next, 6000);
    }catch(e){ if(!autoplay) autoplay = setInterval(next,6000); }
  }
  function stopAutoplay(){ if(autoplay){ clearInterval(autoplay); autoplay = null; } }
  startAutoplay();
  const slideshow = document.getElementById('slideshow');
  if(slideshow){
    slideshow.addEventListener('mouseover', ()=> stopAutoplay());
    slideshow.addEventListener('mouseout', ()=> startAutoplay());
    // Pause autoplay when slideshow receives focus (keyboard navigation)
    slideshow.addEventListener('focus', ()=> stopAutoplay());
    slideshow.addEventListener('blur', ()=> startAutoplay());
    // Keyboard navigation: left/right arrows to move slides
    slideshow.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if(e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });
  }

  /* Demo client-side auth (NOT secure) */
  const authKey = 'gxe_demo_auth';
  function isAuthenticated(){
    return !!localStorage.getItem(authKey);
  }
  function loginDemo(name='Citizen'){
    const payload = {name, id: 'CID-'+Math.floor(Math.random()*900000+100000)};
    localStorage.setItem(authKey, JSON.stringify(payload));
    return payload;
  }
  function logoutDemo(){
    localStorage.removeItem(authKey);
  }

  /* Dedicated login page handling (login.html) */
  const signInBtn = document.getElementById('signInBtn');
  const signUpBtn = document.getElementById('signUpBtn');

  // If we are on the dedicated login page, render the form area
  function renderLoginPage(){
    if(!window.location.pathname.endsWith('/login.html') && !window.location.pathname.endsWith('login.html')) return;
    const authBox = document.getElementById('authBox');
    if(!authBox) return;
    // Build tabs for Sign in / Sign up
    authBox.innerHTML = `
      <div class="auth-tabs">
        <button id="tabSignIn" class="tab active">Sign in</button>
        <button id="tabSignUp" class="tab">Create account</button>
      </div>
      <div id="formArea"></div>
    `;
    document.getElementById('tabSignIn').addEventListener('click', ()=> buildAuthForm('signin'));
    document.getElementById('tabSignUp').addEventListener('click', ()=> buildAuthForm('signup'));
    buildAuthForm('signin');
  }

  // Helper to show error messages in the form area (used on login page)
  function showFormError(msg){
    const formArea = document.getElementById('formArea');
    if(!formArea) return alert(msg);
    let err = formArea.querySelector('.form-error');
    if(!err){ err = document.createElement('div'); err.className='form-error'; formArea.prepend(err); }
    err.textContent = msg;
  }

  function buildAuthForm(mode){
    // formArea is the container inside login.html where we render inputs
    const formArea = document.getElementById('formArea') || document.getElementById('authFormArea');
    if(!formArea) return;
    formArea.innerHTML = '';
    const form = document.createElement('div');
    form.className = 'auth-panel';
    form.innerHTML = `
      <div class="auth-field"><label for="authEmail">Email</label><input id="authEmail" type="email" placeholder="you@domain"/></div>
      <div class="auth-field"><label for="authPassword">Password</label><input id="authPassword" type="password" placeholder="password"/></div>
      ${mode==='signup' ? '<div class="auth-field"><label for="nationName">NationStates name</label><input id="nationName" type="text" placeholder="Your nation name"/></div>' : ''}
    `;
    const actions = document.createElement('div'); actions.className='auth-actions';
    const submit = document.createElement('button'); submit.className='btn-primary'; submit.textContent = mode==='signin' ? 'Sign in' : 'Create account';
    const alt = document.createElement('button'); alt.className='btn-ghost'; alt.textContent = mode==='signin' ? 'Need an account?' : 'Have an account?';
    actions.appendChild(alt); actions.appendChild(submit);
    form.appendChild(actions); formArea.appendChild(form);

    alt.addEventListener('click', ()=> buildAuthForm(mode==='signin' ? 'signup' : 'signin'));

    submit.addEventListener('click', async ()=>{
      const em = document.getElementById('authEmail').value; const pw = document.getElementById('authPassword').value;
      const firebaseConfig = window.__GXE_FIREBASE_CONFIG;
      // basic inline validation
      if(!em || !pw){ showFormError('Please enter email and password.'); return; }
      if(pw.length < 6){ showFormError('Password must be at least 6 characters.'); return; }
      if(firebaseConfig && window.firebase && firebase.auth){
        const auth = firebase.auth();
        try{
          let cred;
          if(mode==='signin'){
            cred = await auth.signInWithEmailAndPassword(em,pw);
          } else {
            cred = await auth.createUserWithEmailAndPassword(em,pw);
            // after account creation, create user doc in Firestore with status 'pending'
            try{
              if(window.firebase && firebase.firestore){
                const db = firebase.firestore();
                const user = cred.user;
                const nation = document.getElementById('nationName') ? document.getElementById('nationName').value : '';
                await db.collection('users').doc(user.uid).set({
                  email: user.email,
                  displayName: user.displayName || em.split('@')[0],
                  nationName: nation || null,
                  status: 'pending',
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
              }
            }catch(fe){ console.warn('Firestore write failed', fe); }
          }
          window.location.href = '/dashboard.html';
        }catch(e){ showFormError(e.message || 'Authentication error'); }
        return;
      }
      // demo fallback
      try{
        const nation = document.getElementById('nationName') ? document.getElementById('nationName').value : '';
        const user = loginDemo(em.split('@')[0]);
        // persist nationName for demo
        const demoData = JSON.parse(localStorage.getItem(authKey)); demoData.nationName = nation || null; localStorage.setItem(authKey, JSON.stringify(demoData));
        window.location.href = '/dashboard.html';
      }catch(e){ showFormError('Demo login failed'); }
    });

    // add show/hide password toggle when on login page
    const pwd = document.getElementById('authPassword');
    if(pwd){
      const toggle = document.createElement('button'); toggle.type='button'; toggle.className='show-pass'; toggle.textContent='Show';
      toggle.addEventListener('click', ()=>{ if(pwd.type==='password'){ pwd.type='text'; toggle.textContent='Hide'; } else { pwd.type='password'; toggle.textContent='Show'; } });
      // place toggle after password input
      pwd.parentNode && pwd.parentNode.appendChild(toggle);
    }
  }

  // Update account link behaviour
  const accountLink = document.getElementById('accountLink');
  if(accountLink){
    accountLink.addEventListener('click', (e)=>{
      if(isAuthenticated()) return; // allow go to dashboard if logged in
      // Redirect to dedicated login page when not authenticated
      e.preventDefault(); window.location.href = '/login.html';
    });
  }

  /* NEW: Theme persistence and simple settings UI */
  const themeSelect = document.getElementById('themeSelect');
  const THEME_KEY = 'gxe_theme_pref';
  /* Cookie helpers - use cookies for slightly more persistent per-user preferences; fall back to localStorage when unavailable */
  function setCookie(name, value, days){
    try{
      if(typeof days === 'undefined') days = 365;
      const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
      // Mark Secure so cookies are only sent over HTTPS (safe for GitHub Pages). Keep SameSite=Lax for reasonable CSRF protection.
      const secureFlag = '; Secure';
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`;
    }catch(e){ console.warn('setCookie failed', e); }
  }
  function getCookie(name){
    try{
      const m = document.cookie.match('(?:^|; )'+encodeURIComponent(name)+'=([^;]*)');
      return m ? decodeURIComponent(m[1]) : null;
    }catch(e){ return null; }
  }
  function removeCookie(name){
    try{ 
      // expire and include Secure/SameSite attributes to ensure removal in secure contexts
      const attrs = '; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure';
      document.cookie = `${encodeURIComponent(name)}=;${attrs}`;
    }catch(e){ }
  }

  // Remove any theme-related classes from <body> to ensure only the chosen theme is applied
  function clearThemeClasses(){
    const list = ['theme-light','theme-dark','theme-midnight','theme-colorblind'];
    list.forEach(c=> document.body.classList.remove(c));
  }

  // applyTheme: ensures previous themes are removed and persists choice in cookie + localStorage
  function applyTheme(name){
    clearThemeClasses();
    if(!name || name === 'auto'){
      // respect prefers-color-scheme and remove saved preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
      try{ localStorage.removeItem(THEME_KEY); removeCookie(THEME_KEY); }catch(e){}
      return;
    }
    const cls = 'theme-'+name;
    document.body.classList.add(cls);
    try{ localStorage.setItem(THEME_KEY, name); setCookie(THEME_KEY, name, 365); }catch(e){ setCookie(THEME_KEY, name, 365); }
  }
  // init theme select control - prefer cookie, then localStorage, then default to 'auto'
  try{
    let saved = getCookie(THEME_KEY) || localStorage.getItem(THEME_KEY) || 'auto';
    // defensive: if saved isn't one of allowed values, fallback to auto
    const allowed = ['auto','light','dark','midnight','colorblind'];
    if(!allowed.includes(saved)) saved = 'auto';
    if(themeSelect){ themeSelect.value = saved; themeSelect.addEventListener('change', ()=>{ const v = themeSelect.value; applyTheme(v); }); }
    applyTheme(saved);
  }catch(e){ console.warn('Theme init failed', e); }

  /* NEW: Clocks management (addable timezones) */
  const clocksKey = 'gxe_clocks';
  const clocksList = document.getElementById('clocksList');
  const addClockBtn = document.getElementById('addClockBtn');
  const timezoneInput = document.getElementById('timezoneInput');
  const timezoneList = document.getElementById('timezoneList');
  function loadClocks(){
    try{
      // prefer cookie-backed clocks for slightly higher persistence across sessions; fallback to localStorage
      const cookieVal = getCookie(clocksKey);
      if(cookieVal){ try{ return JSON.parse(cookieVal); }catch(e){} }
      return JSON.parse(localStorage.getItem(clocksKey) || '[]');
    }catch(e){ return []; }
  }
  function saveClocks(arr){
    try{ const str = JSON.stringify(arr); localStorage.setItem(clocksKey, str); setCookie(clocksKey, str, 365); }catch(e){ try{ localStorage.setItem(clocksKey, JSON.stringify(arr)); }catch(_){} }
  }

  // Render clocks list; if none exist, show a Xana Standard Time fallback entry
  function renderClocks(){
    if(!clocksList) return;
    clocksList.innerHTML = '';
    const clocks = loadClocks();
    if(!clocks || clocks.length === 0){
      const li = document.createElement('li'); li.className = 'clock-xst-default';
      const left = document.createElement('div');
      left.innerHTML = `<div class="clock-tz">Xana Standard Time</div><div class="clock-time" data-tz="XST">28:28:00 XST</div>`;
      li.appendChild(left);
      clocksList.appendChild(li);
      return;
    }
    clocks.forEach((tz,idx)=>{
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.innerHTML = `<div class="clock-tz">${tz}</div><div class="clock-time" data-tz="${tz}">--:--:--</div>`;
      const rem = document.createElement('button'); rem.className='btn-ghost'; rem.textContent='Remove';
      rem.addEventListener('click', ()=>{ clocks.splice(idx,1); saveClocks(clocks); renderClocks(); });
      li.appendChild(left); li.appendChild(rem); clocksList.appendChild(li);
    });
  }

  // Tick and update displayed clocks every second. Special-case 'XST' to show the requested static value.
  function tickClocks(){
    const els = document.querySelectorAll('.clock-time');
    els.forEach(el=>{
      const tz = el.getAttribute('data-tz');
      if(tz === 'XST'){
        el.textContent = '28:28:00 XST';
      } else {
        try{
          const now = new Date();
          const opts = {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:tz};
          el.textContent = new Intl.DateTimeFormat([],opts).format(now);
        }catch(e){
          el.textContent = new Date().toUTCString().split(' ')[4];
        }
      }
      // small pulse animation on update: restart by removing then forcing reflow
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    });
  }

  setInterval(tickClocks, 1000);
  renderClocks();

  if(addClockBtn){ addClockBtn.addEventListener('click', ()=>{
    const tz = timezoneInput && timezoneInput.value ? timezoneInput.value.trim() : '';
    if(!tz){ alert('Please enter a timezone (for example: Europe/London)'); timezoneInput && timezoneInput.focus(); return; }
    const clocks = loadClocks(); clocks.push(tz); saveClocks(clocks); renderClocks(); tickClocks(); timezoneInput.value='';
  }); }

  // Focus trap for overlay while open (basic)
  let lastFocused = null;
  function trapFocus(e){ if(!siteOverlay || siteOverlay.getAttribute('aria-hidden')==='true') return; const focusable = siteOverlay.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'); if(focusable.length===0) return; const first = focusable[0]; const last = focusable[focusable.length-1]; if(e.key==='Tab'){
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  } }
  document.addEventListener('keydown', trapFocus);
  // When opening overlay, store last focus and move focus to first interactive element
  function openOverlay(){ if(!siteOverlay) return; lastFocused = document.activeElement; siteOverlay.setAttribute('aria-hidden','false'); if(navToggle) navToggle.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; const f = siteOverlay.querySelector('a,button,input,select'); if(f) f.focus(); }
  function closeOverlay(){ if(!siteOverlay) return; siteOverlay.setAttribute('aria-hidden','true'); if(navToggle) navToggle.setAttribute('aria-expanded','false'); document.body.style.overflow=''; if(lastFocused && lastFocused.focus) lastFocused.focus(); }

  // Attach nav toggle and overlay close handlers if present (ensure they reference the consolidated functions)
  // Re-query in case overlay elements were injected after initial load
  if(!siteOverlay) siteOverlay = document.getElementById('siteOverlay');
  if(!overlayClose) overlayClose = document.getElementById('overlayClose');
  if(navToggle){ navToggle.addEventListener('click', (e)=>{ const expanded = navToggle.getAttribute('aria-expanded') === 'true'; if(expanded) closeOverlay(); else openOverlay(); }); }
  if(overlayClose) overlayClose.addEventListener('click', closeOverlay);

  // Widget entrance animation when overlay opens
  const widgetsRoot = document.querySelector('.widgets');
  function animateWidgetsIn(){ if(!widgetsRoot) return; const widgets = widgetsRoot.querySelectorAll('.widget'); widgets.forEach((w,i)=>{ w.style.opacity=0; w.style.transform='translateY(12px)'; setTimeout(()=>{ w.style.transition='opacity .4s ease, transform .45s cubic-bezier(.2,.9,.3,1)'; w.style.opacity=1; w.style.transform='translateY(0)'; }, 80*i); }); }
  if(siteOverlay){ const mo = new MutationObserver((ml)=>{ for(const m of ml){ if(m.type==='attributes' && m.attributeName==='aria-hidden' && siteOverlay.getAttribute('aria-hidden')==='false'){ setTimeout(animateWidgetsIn,120); } } }); mo.observe(siteOverlay,{attributes:true}); }

  // Reduced motion / UI effects toggle
  const REDUCE_UI_KEY = 'gxe_reduce_ui';
  const reduceToggle = document.getElementById('reduceMotionToggle');
  function applyReduceUI(val){ if(val){ document.body.classList.add('reduce-ui'); } else { document.body.classList.remove('reduce-ui'); } localStorage.setItem(REDUCE_UI_KEY, val ? '1' : '0'); }
  try{
    const saved = localStorage.getItem(REDUCE_UI_KEY);
    const isReduced = saved === '1';
    applyReduceUI(isReduced);
    if(reduceToggle){ reduceToggle.checked = isReduced; reduceToggle.addEventListener('change', ()=> applyReduceUI(reduceToggle.checked)); }
  }catch(e){ console.warn('Reduce UI init failed', e); }

  /* NEW: Simple mini calendar renderer */
  function renderMiniCalendar(){ const cal = document.getElementById('miniCalendar'); if(!cal) return; cal.innerHTML=''; const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const first = new Date(year,month,1); const startDow = first.getDay(); const daysInMonth = new Date(year,month+1,0).getDate(); const grid = document.createElement('div'); grid.className='calendar-grid'; grid.innerHTML = '<div class="cal-header">Sun Mon Tue Wed Thu Fri Sat</div>'; const cells = document.createElement('div'); cells.className='cal-cells'; for(let i=0;i<startDow;i++){ const c = document.createElement('div'); c.className='cal-cell empty'; cells.appendChild(c); }
    for(let d=1; d<=daysInMonth; d++){ const c = document.createElement('div'); c.className='cal-cell'; if(d===now.getDate()) c.classList.add('today'); c.textContent = d; cells.appendChild(c); }
    grid.appendChild(cells); cal.appendChild(grid);
  }
  renderMiniCalendar();

  /* NEWS FEED: fetch /assets/news.json and render simple accessible feed on home page */
  function loadNewsFeed(){
    const listEl = document.getElementById('newsList');
    if(!listEl) return;
  fetch('assets/news.json').then(r=>{
      if(!r.ok) throw new Error('news fetch failed');
      return r.json();
    }).then(items=>{
      if(!items || !items.length){ listEl.innerHTML = '<p>No news at this time.</p>'; return; }
      listEl.innerHTML = '';
        items.forEach(it=>{
          const item = document.createElement('article'); item.className='news-item';
          // Headline and meta (use semantic h3 + time for accessibility)
          const h = document.createElement('h3'); h.style.margin='0 0 .25rem 0';
          const link = document.createElement('a'); link.className='title'; link.href = it.url || '#'; link.textContent = it.title || 'Untitled';
          // If the link is external (starts with http), ensure it opens in new tab and is safe
          try{
            const u = new URL(link.href, window.location.origin);
            if(u.origin !== window.location.origin){ link.target = '_blank'; link.rel = 'noopener noreferrer'; }
          }catch(e){}
          h.appendChild(link);

          const meta = document.createElement('div'); meta.className='meta';
          const timeEl = document.createElement('time'); timeEl.dateTime = it.date || ''; timeEl.textContent = it.date || '';
          meta.textContent = ' \u00b7 ' + (it.category || 'news');
          meta.insertBefore(timeEl, meta.firstChild);

          const excerpt = document.createElement('p'); excerpt.className='excerpt'; excerpt.textContent = it.excerpt || '';
          excerpt.style.margin = '.35rem 0 0 0';

          item.appendChild(meta);
          item.appendChild(h);
          item.appendChild(excerpt);

          listEl.appendChild(item);
        });
    }).catch(e=>{ console.warn('News load failed', e); const le = document.getElementById('newsList'); if(le) le.innerHTML = '<p>Unable to load news.</p>'; });
  }
  // only load on the home page (index.html)
  try{ if(window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) loadNewsFeed(); }catch(e){}

  /* NEW: Lightweight weather fetch using Open-Meteo (no API key) - fetches based on browser geolocation if allowed */
  const weatherBox = document.getElementById('weatherBox');
  // Map Open-Meteo weathercode to simple condition keywords
  const weatherCodeMap = (code)=>{
    // condensed mapping based on WMO weather codes used by Open-Meteo
    if(code===0) return 'clear'; // clear sky
    if(code===1||code===2||code===3) return 'partly-cloudy';
    if((code>=45 && code<=48) || (code>=51 && code<=57) || (code>=61 && code<=67) || (code>=80 && code<=82)) return 'rain';
    if((code>=71 && code<=77) || (code>=85 && code<=86)) return 'snow';
    if(code>=95 && code<=99) return 'thunder';
    return 'cloudy';
  };

  function fetchWeather(lat,lon){ if(!weatherBox) return; weatherBox.textContent='Loading…';
    // request sunrise/sunset to determine day/night
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;
    fetch(url).then(r=>r.json()).then(data=>{
      if(data && data.current_weather){ const c = data.current_weather; // determine day/night from daily sunrise/sunset if available
        let isDay = true;
        try{
          if(data.daily && data.daily.sunrise && data.daily.sunrise.length){
            // compare current time with today's sunrise/sunset
            const now = new Date();
            const todaySunrise = new Date(data.daily.sunrise[0]);
            const todaySunset = new Date(data.daily.sunset[0]);
            isDay = (now >= todaySunrise && now <= todaySunset);
          } else if(typeof c.is_day !== 'undefined'){
            isDay = !!c.is_day;
          }
        }catch(e){ console.warn('Day/night detect failed', e); }

        const cond = weatherCodeMap(c.weathercode);
        // set classes for CSS-driven animations
        weatherBox.className = '';
        weatherBox.classList.add('weather-area');
        weatherBox.classList.add('weather-'+cond);
        weatherBox.classList.add(isDay? 'day':'night');

        // inject simple animated SVGs per condition + summary text
        let iconHTML = '';
        if(cond==='clear' || cond==='partly-cloudy'){
          // sun (partly-cloudy will include a small cloud)
          iconHTML = `<div class="weather-visual sun" aria-hidden="true"><svg viewBox="0 0 64 64" width="64" height="64"><g class="sun-core"><circle cx="32" cy="32" r="12" fill="currentColor"/></g><g class="sun-rays" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M32 4v8"/><path d="M32 52v8"/><path d="M4 32h8"/><path d="M52 32h8"/><path d="M12 12l5.6 5.6"/><path d="M46.4 46.4l5.6 5.6"/><path d="M12 52l5.6-5.6"/><path d="M46.4 17.6l5.6-5.6"/></g></svg></div>`;
          if(cond==='partly-cloudy') iconHTML += `<div class="weather-visual small-cloud" aria-hidden="true"><svg viewBox="0 0 64 32" width="64" height="32"><path d="M20 6c-6 0-10 4-10 8h38c0-5-4-10-10-10-2 0-4 1-6 2-2-2-4-2-6-2z" fill="currentColor"/></svg></div>`;
        } else if(cond==='cloudy'){
          iconHTML = `<div class="weather-visual cloud" aria-hidden="true"><svg viewBox="0 0 64 32" width="64" height="32"><path d="M20 6c-6 0-10 4-10 8h38c0-5-4-10-10-10-2 0-4 1-6 2-2-2-4-2-6-2z" fill="currentColor"/></svg></div>`;
        } else if(cond==='rain'){
          iconHTML = `<div class="weather-visual cloud" aria-hidden="true"><svg viewBox="0 0 64 32" width="64" height="32"><path d="M20 6c-6 0-10 4-10 8h38c0-5-4-10-10-10-2 0-4 1-6 2-2-2-4-2-6-2z" fill="currentColor"/></svg></div><div class="weather-visual rain-drops" aria-hidden="true"><span class="drop"></span><span class="drop"></span><span class="drop"></span></div>`;
        } else if(cond==='snow'){
          iconHTML = `<div class="weather-visual cloud" aria-hidden="true"><svg viewBox="0 0 64 32" width="64" height="32"><path d="M20 6c-6 0-10 4-10 8h38c0-5-4-10-10-10-2 0-4 1-6 2-2-2-4-2-6-2z" fill="currentColor"/></svg></div><div class="weather-visual snow-drift" aria-hidden="true"><span class="flake"></span><span class="flake"></span><span class="flake"></span></div>`;
        } else if(cond==='thunder'){
          iconHTML = `<div class="weather-visual cloud" aria-hidden="true"><svg viewBox="0 0 64 32" width="64" height="32"><path d="M20 6c-6 0-10 4-10 8h38c0-5-4-10-10-10-2 0-4 1-6 2-2-2-4-2-6-2z" fill="currentColor"/></svg></div><div class="weather-visual bolt" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M13 2 L3 14h7l-1 8 10-12h-7z" fill="currentColor"/></svg></div>`;
        } else {
          iconHTML = `<div class="weather-visual cloud" aria-hidden="true"><svg viewBox="0 0 64 32" width="64" height="32"><path d="M20 6c-6 0-10 4-10 8h38c0-5-4-10-10-10-2 0-4 1-6 2-2-2-4-2-6-2z" fill="currentColor"/></svg></div>`;
        }

        // determine local hour at the location using timezone offset if available
        let localHour = (new Date()).getHours();
        try{
          // if api provides timezone and time, parse current_weather.time with timezone-auto
          if(c && c.time){ const local = new Date(c.time); if(!isNaN(local.getTime())) localHour = local.getHours(); }
        }catch(e){ /* ignore */ }

        // pick time-of-day bucket
        let tod = 't-afternoon';
        if(localHour >=5 && localHour <10) tod = 't-morning';
        else if(localHour >=10 && localHour <17) tod = 't-afternoon';
        else if(localHour >=17 && localHour <20) tod = 't-evening';
        else tod = 't-night';

        // Add cityscape container which changes by tod
        const cityscapeHTML = `<div class="weather-cityscape ${tod}" aria-hidden="true">
          <div class="sky"></div>
          <div class="sun-moon" aria-hidden="true"></div>
          <div class="cloud-layer" aria-hidden="true"></div>
          <div class="buildings" aria-hidden="true">
            <div class="b b1"></div>
            <div class="b b2"></div>
            <div class="b b3"></div>
            <div class="b b4"></div>
            <div class="b b5"></div>
          </div>
        </div>`;

        weatherBox.innerHTML = `<div class="weather-head"><div class="weather-summary"><strong>${c.temperature}°C</strong> — ${cond.replace('-',' ')}</div></div><div class="weather-vis">${iconHTML}</div>${cityscapeHTML}`;
        // small hook: add class for condition to cityscape for extra effects
        const cs = weatherBox.querySelector('.weather-cityscape'); if(cs) cs.classList.add('cond-'+cond);
        // if night, generate stars layer with randomized positions
        if(tod === 't-night' && cs){
          const stars = document.createElement('div'); stars.className = 'stars';
          const starCount = 28;
          for(let i=0;i<starCount;i++){
            const s = document.createElement('span'); s.className='star';
            const left = Math.round(Math.random()*100);
            const top = Math.round(Math.random()*45); // within sky area
            const size = Math.round(6 + Math.random()*8); // 6-14px
            s.style.left = left+'%'; s.style.top = top+'%'; s.style.width = size+'px'; s.style.height = size+'px';
            // staggered animation delay
            s.style.animationDelay = (Math.random()*2)+'s';
            stars.appendChild(s);
          }
          cs.appendChild(stars);
        }
      } else weatherBox.textContent='Weather unavailable';
    }).catch(e=>{ console.warn('Weather fetch failed', e); if(weatherBox) weatherBox.textContent='Unable to load weather'; }); }
  if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(pos=> fetchWeather(pos.coords.latitude,pos.coords.longitude), err=>{ if(weatherBox) weatherBox.textContent='Location denied — weather unavailable'; }); } else { if(weatherBox) weatherBox.textContent='No geolocation'; }

  // Render login page if present
  try{ renderLoginPage(); }catch(e){ /* ignore if not present */ }

  /* HOMEPAGE POLL: simple client-side poll with localStorage persistence */
  (function(){
    const POLL_KEY = 'gxe_home_poll_v1';
    const pollForm = document.getElementById('pollForm');
    const pollOptionsRoot = document.getElementById('pollOptions');
    const pollResults = document.getElementById('pollResults');
    const voteBtn = document.getElementById('voteBtn');
    const viewResultsBtn = document.getElementById('viewResultsBtn');

    if(!pollForm || !pollOptionsRoot) return;

    // sample options (could be loaded from assets/news.json or remote later)
    const options = [
      {id:'economy', label:'Stronger economy & jobs'},
      {id:'health', label:'Healthcare & social services'},
      {id:'education', label:'Education & opportunity'},
      {id:'defense', label:'Security & national defense'},
      {id:'climate', label:'Climate & environment'}
    ];

    function loadVotes(){ try{ return JSON.parse(localStorage.getItem(POLL_KEY) || '{}'); }catch(e){ return {}; } }
    function saveVotes(obj){ try{ localStorage.setItem(POLL_KEY, JSON.stringify(obj)); }catch(e){ console.warn('saveVotes failed', e); } }

    // render radio options
    function renderOptions(){ pollOptionsRoot.innerHTML = ''; const v = loadVotes(); const selected = v.lastChoice || null;
      options.forEach(opt=>{
        const id = 'poll_opt_'+opt.id;
        const wrap = document.createElement('div'); wrap.className = 'poll-option';
        wrap.innerHTML = `<input type="radio" name="pollChoice" id="${id}" value="${opt.id}" ${selected===opt.id? 'checked':''} /> <label for="${id}">${opt.label}</label>`;
        pollOptionsRoot.appendChild(wrap);
      });
    }

    function renderResults(){ const votes = loadVotes(); const counts = votes.counts || {}; const total = Object.values(counts).reduce((a,b)=>a+(b||0),0) || 0; pollResults.innerHTML = '';
      options.forEach(opt=>{
        const c = counts[opt.id] || 0; const pct = total? Math.round((c/total)*100) : 0;
        const row = document.createElement('div'); row.className = 'poll-result-row';
        row.innerHTML = `<div class="poll-result-label">${opt.label} <small class="muted">${c} votes</small></div><div class="poll-result-bar"><div class="poll-result-fill" style="width:${pct}%" aria-hidden="true"></div><span class="visually-hidden">${pct}%</span></div>`;
        pollResults.appendChild(row);
      });
      pollResults.hidden = false;
    }

    pollForm.addEventListener('submit', (e)=>{
      e.preventDefault(); const choice = pollForm.querySelector('input[name="pollChoice"]:checked'); if(!choice){ alert('Please select an option'); return; }
      const val = choice.value; const votes = loadVotes(); votes.counts = votes.counts || {}; votes.counts[val] = (votes.counts[val] || 0) + 1; votes.lastChoice = val; saveVotes(votes); renderResults();
      // small thank you state
      voteBtn.textContent = 'Thanks!'; voteBtn.disabled = true; setTimeout(()=>{ voteBtn.textContent = 'Vote'; voteBtn.disabled = false; }, 1600);
    });
    viewResultsBtn && viewResultsBtn.addEventListener('click', (e)=>{ e.preventDefault(); renderResults(); pollResults.scrollIntoView({behavior:'smooth'}); });

    // initial render
    renderOptions();
    // if user already voted, show results
    try{ const st = loadVotes(); if(st && st.counts && Object.keys(st.counts).length) renderResults(); }catch(e){}
  })();

  // (Get Involved FAB & volunteer modal removed)

  /* EVENTS WIDGET: load events.json and render on homepage and dashboard */
  (function(){
    function renderEventCard(ev){ const d = document.createElement('article'); d.className='event-card card'; d.innerHTML = `<h4><a href="${ev.url || '#'}">${ev.title}</a></h4><div class="muted">${ev.date} ${ev.time} — ${ev.location}</div><p>${ev.excerpt}</p>`; return d; }
  function loadEvents(){ fetch('assets/events.json').then(r=>{ if(!r.ok) throw new Error('events fetch failed'); return r.json(); }).then(items=>{
        // homepage
        const list = document.getElementById('eventsList'); if(list){ list.innerHTML=''; if(!items || !items.length) { list.innerHTML = '<p>No upcoming events.</p>'; } else { items.slice(0,6).forEach(ev=> list.appendChild(renderEventCard(ev))); } }
        // dashboard
        const dlist = document.getElementById('dashboardEventsList'); if(dlist){ dlist.innerHTML=''; if(!items || !items.length){ dlist.innerHTML='<p>No upcoming events.</p>'; } else { const upcoming = items.slice(0,4); upcoming.forEach(ev=> dlist.appendChild(renderEventCard(ev))); } }
      }).catch(e=>{ console.warn('Events load failed', e); const l = document.getElementById('eventsList'); if(l) l.innerHTML='<p>Unable to load events.</p>'; const dl = document.getElementById('dashboardEventsList'); if(dl) dl.innerHTML='<p>Unable to load events.</p>'; }); }
    try{ loadEvents(); }catch(e){ console.warn('events init failed', e); }
  })();

  /* DEPARTMENTS: expand/collapse cards for department details */
  (function(){
    const deptRoots = document.querySelectorAll('.dept-card');
    if(!deptRoots || deptRoots.length===0) return;
    deptRoots.forEach(card=>{
      const btn = card.querySelector('.expand-btn'); const panelId = btn && btn.getAttribute('aria-controls'); const panel = panelId ? document.getElementById(panelId) : null;
      if(!btn || !panel) return;
      function toggle(){ const expanded = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!expanded)); if(expanded) { panel.hidden = true; } else { panel.hidden = false; panel.querySelector('a,button,input') && panel.querySelector('a,button,input').focus(); } }
      btn.addEventListener('click', toggle);
      btn.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); } });
    });
  })();

  /* NEWSLETTER MODAL: intercept footer newsletter forms and provide modal signup with persistence */
  (function(){
    // create modal markup once
    const existing = document.getElementById('newsletterModal');
    if(!existing){
      const modal = document.createElement('div'); modal.id='newsletterModal'; modal.className='auth-modal'; modal.setAttribute('aria-hidden','true');
      modal.innerHTML = `<div class="auth-modal-panel" role="dialog" aria-modal="true" aria-labelledby="newsletterTitle">
        <button class="modal-close" id="newsletterClose" aria-label="Close">✕</button>
        <h2 id="newsletterTitle">Subscribe to updates</h2>
        <p>Enter your email to receive official announcements and event notices.</p>
        <div class="auth-field"><label for="newsEmail">Email address</label><input id="newsEmail" type="email" placeholder="you@domain" /></div>
        <div class="auth-actions"><button id="newsSubmit" class="btn-primary">Subscribe</button> <button id="newsCancel" class="btn-ghost">Cancel</button></div>
      </div>`;
      document.body.appendChild(modal);
      // wire handlers with focus management and accessible interactions
      let _prevActive = null;
      const modalEl = document.getElementById('newsletterModal');
      const panelEl = modalEl.querySelector('.auth-modal-panel');
      function close(){ const m = document.getElementById('newsletterModal'); if(!m) return; m.setAttribute('aria-hidden','true'); m.style.display='none'; document.body.style.overflow=''; if(_prevActive && _prevActive.focus) _prevActive.focus(); _prevActive = null; }
      function open(){ const m = document.getElementById('newsletterModal'); if(!m) return; _prevActive = document.activeElement; m.setAttribute('aria-hidden','false'); m.style.display='flex'; document.body.style.overflow='hidden'; const inpt = m.querySelector('input'); if(inpt) inpt.focus(); }
      // attach submit handler to any footer newsletter forms
      const forms = document.querySelectorAll('.newsletter-form');
      forms.forEach(f => {
        // remove inline onsubmit if present (best-effort)
        try{ f.onsubmit = null; }catch(e){}
        f.addEventListener('submit', function(ev){ ev.preventDefault(); open(); });
      });
      // close on close button and cancel
      document.getElementById('newsletterClose').addEventListener('click', close);
      document.getElementById('newsCancel').addEventListener('click', close);
      // close on Escape
      document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape'){ const m = document.getElementById('newsletterModal'); if(m && m.getAttribute('aria-hidden') === 'false') close(); } });
      // click on backdrop (outside panel) closes modal
      modal.addEventListener('click', function(ev){ if(ev.target === modal){ close(); } });
      document.getElementById('newsSubmit').addEventListener('click', ()=>{
        const val = document.getElementById('newsEmail').value.trim(); if(!val || !val.includes('@')){ alert('Please enter a valid email'); return; }
        try{ const key='gxe_newsletter_v1'; const arr = JSON.parse(localStorage.getItem(key) || '[]'); arr.push({email:val, ts:new Date().toISOString()}); localStorage.setItem(key, JSON.stringify(arr)); }catch(e){ console.warn('newsletter save failed', e); }
        const panel = document.querySelector('#newsletterModal .auth-modal-panel'); panel.innerHTML = `<h2>Subscribed</h2><p>Thanks — you'll receive official updates at <strong>${val}</strong> (demo).</p><div class="auth-actions"><button id="newsDone" class="btn-primary">Done</button></div>`;
        document.getElementById('newsDone').addEventListener('click', close);
      });
    }
  })();

  // Dashboard page boot
  if(window.location.pathname.endsWith('/dashboard.html') || window.location.pathname.endsWith('dashboard.html')){
    const authArea = document.getElementById('authArea');
    const dashboardContent = document.getElementById('dashboardContent');
    const logoutBtn = document.getElementById('logoutBtn');
    // If Firebase config is provided, load Firebase and use it for auth
    const firebaseConfig = window.__GXE_FIREBASE_CONFIG;
    if(firebaseConfig){
      // dynamically load Firebase scripts then init
      const s1 = document.createElement('script'); s1.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js'; document.head.appendChild(s1);
      const s2 = document.createElement('script'); s2.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js'; document.head.appendChild(s2);
      const s3 = document.createElement('script'); s3.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js'; document.head.appendChild(s3);
      s2.onload = ()=>{
        try{ firebase.initializeApp(firebaseConfig); const auth = firebase.auth();
          if(auth.currentUser){
            const user = auth.currentUser;
            // Check Firestore user doc for approval status
            if(window.firebase && firebase.firestore){
              const db = firebase.firestore();
              db.collection('users').doc(user.uid).get().then(doc=>{
                const data = doc.exists ? doc.data() : null;
                const status = data && data.status ? data.status : 'pending';
                if(status === 'approved'){
                  if(authArea) authArea.style.display='none'; if(dashboardContent){dashboardContent.style.display='block';document.getElementById('userName').textContent = data.displayName || user.email;document.getElementById('userNation').textContent = data.nationName || '—';document.getElementById('userId').textContent = user.uid;document.getElementById('userStatus').textContent = status}
                  if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ auth.signOut().then(()=>location.href='/') });
                } else {
                  if(dashboardContent) dashboardContent.style.display='none';
                  if(authArea) authArea.innerHTML = `<p>Your account is <strong>${status}</strong>. Waiting for admin approval.</p><p><button id="signOutBtn">Sign out</button></p>`;
                  document.getElementById('signOutBtn').addEventListener('click', ()=>{ auth.signOut().then(()=>location.href='/') });
                }
              }).catch(err=>{
                console.error('Error reading user doc', err);
                if(authArea) authArea.innerHTML = '<p>Unable to verify account status. Contact admin.</p>';
              });
            } else {
              // No Firestore available, show dashboard anyway
              if(authArea) authArea.style.display='none'; if(dashboardContent){dashboardContent.style.display='block';document.getElementById('userName').textContent = user.displayName || user.email;document.getElementById('userNation').textContent = '—';document.getElementById('userId').textContent = user.uid}
              if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ auth.signOut().then(()=>location.href='/') });
            }
          } else {
            if(authArea) authArea.innerHTML = `<p>Sign in with email</p><input id="email" placeholder="email"><input id="password" placeholder="password" type="password"><button id="fbLogin">Sign in</button> <button id="fbRegister">Register</button>`;
            document.getElementById('fbLogin').addEventListener('click', ()=>{ const em=document.getElementById('email').value; const pw=document.getElementById('password').value; auth.signInWithEmailAndPassword(em,pw).then(()=>location.reload()).catch(e=>alert(e.message)) });
            document.getElementById('fbRegister').addEventListener('click', ()=>{ const em=document.getElementById('email').value; const pw=document.getElementById('password').value; auth.createUserWithEmailAndPassword(em,pw).then(()=>location.reload()).catch(e=>alert(e.message)) });
          }
        }catch(e){console.error('Firebase init error',e);}
      };
      return; // stop demo flow
    }

    if(isAuthenticated()){
      const user = JSON.parse(localStorage.getItem(authKey));
      if(authArea) authArea.style.display = 'none';
        if(dashboardContent){
        dashboardContent.style.display = 'block';
        const nameEl = document.getElementById('userName'); if(nameEl) nameEl.textContent = user.name;
        const idEl = document.getElementById('userId'); if(idEl) idEl.textContent = user.id;
        const nationEl = document.getElementById('userNation'); if(nationEl) nationEl.textContent = user.nationName || '—';
        const statusEl = document.getElementById('userStatus'); if(statusEl) statusEl.textContent = 'approved (demo)';
      }
      if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ logoutDemo(); window.location.href = '/'; });
    } else {
      if(authArea) authArea.innerHTML = '<p>You are not signed in. <button id="demoLoginBtn">Sign in (demo)</button></p>';
      const demoLoginBtn = document.getElementById('demoLoginBtn');
      if(demoLoginBtn) demoLoginBtn.addEventListener('click', ()=>{
        const name = prompt('Demo registration — enter your name:');
        if(name){ loginDemo(name); window.location.reload(); }
      });
    }
  }
});

