(function(){
    async function loadHeader(){
        try{
            const tryCss = async (hrefs)=>{
                for(const href of hrefs){
                    try{
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = href;
                        document.head.appendChild(link);
                        return;
                    }catch(e){
                        e

                    }
                }
            };

            await tryCss(['/css/header.css','../css/header.css']);

            const tryFetch = async (urls)=>{
                for(const u of urls){
                    try{
                        const r = await fetch(u,{cache:'no-store'});
                        if(r.ok) return r;
                    }catch(e){}
                }
                return null;
            };

            const res = await tryFetch([
                '/partials/header.html','partials/header.html','../partials/header.html',
                'header.html','./header.html','../header.html','../html/header.html'
            ]);
            if(!res) return;
            const html = await res.text();
            const container = document.getElementById('site-header');
            if(!container) return;
            container.innerHTML = html;

            const path = window.location.pathname.split('/').pop() || 'home.html';
            const mapping = {
                'home.html':'.nav-home',
                '':'.nav-home',
                'about.html':'.nav-about',
                'admission.html':'.nav-admissions',
                'academics.html':'.nav-academics',
                'contact.html':'.nav-contact',
                'students.html':'.nav-students',
                'teachers.html':'.nav-teachers',
                'parents.html':'.nav-parents',
            };
            const selector = mapping[path];
            if(selector){
                const el = container.querySelector(selector);
                if(el) el.classList.add('active');
            }

            const toggle = container.querySelector('.nav-toggle');
            const nav = container.querySelector('#main-nav');
            if(toggle && nav){
                toggle.addEventListener('click',()=>{
                    const open = nav.classList.toggle('open');
                    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                });

                nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
                    nav.classList.remove('open');
                    toggle.setAttribute('aria-expanded','false');
                }));

                document.addEventListener('click',(ev)=>{
                    if(!nav.contains(ev.target) && !toggle.contains(ev.target)){
                        nav.classList.remove('open');
                        toggle.setAttribute('aria-expanded','false');
                    }
                });
            }
        }catch(err){
            console.error('Error loading header:',err);
        }
    }
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }
})();
