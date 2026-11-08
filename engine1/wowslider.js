/* Local WOWSlider-style carousel for ETEL PHONE. No external dependency. */
(function(window){'use strict';
window.ETELWowSlider=function(selector,options){
 var root=document.querySelector(selector); if(!root)return;
 var slides=[].slice.call(root.querySelectorAll('.ws-slide'));
 var dots=[].slice.call(root.querySelectorAll('.ws-dot'));
 var prev=root.querySelector('.ws-prev'), next=root.querySelector('.ws-next');
 if(slides.length<2)return;
 var i=0, delay=(options&&options.delay)||4500, timer;
 function go(n){i=(n+slides.length)%slides.length;slides.forEach(function(s,k){s.classList.toggle('active',k===i)});dots.forEach(function(d,k){d.classList.toggle('active',k===i)});}
 function restart(){clearInterval(timer);timer=setInterval(function(){go(i+1)},delay);}
 dots.forEach(function(d,k){d.addEventListener('click',function(){go(k);restart()})});
 if(prev)prev.addEventListener('click',function(){go(i-1);restart()});
 if(next)next.addEventListener('click',function(){go(i+1);restart()});
 root.addEventListener('mouseenter',function(){clearInterval(timer)});
 root.addEventListener('mouseleave',restart);
 go(0); restart();
};
})(window);
