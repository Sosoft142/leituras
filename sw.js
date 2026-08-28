/* Service worker do Tracker de Leituras.
   Estratégia: REDE PRIMEIRO, cache só como reserva. O app é um arquivo só que
   se atualiza subindo por cima; com "cache primeiro" quem já tivesse aberto
   ficaria preso numa versão velha até limpar o navegador. Assim a versão do
   servidor sempre vence, e o cache existe apenas para abrir sem internet.
   Os dados ficam no localStorage e não passam por aqui. */
var CACHE = 'tracker-leituras-v1';

self.addEventListener('install', function(e){
  self.skipWaiting();
  /* Guarda o próprio HTML já na instalação: sem isto, quem instalasse e ficasse
     offline antes da primeira navegação abriria uma tela em branco. */
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(['./', './index.html']).catch(function(){});
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  /* Só o que é deste domínio entra no cache. Fontes do Google e a API do GitHub
     ficam de fora: guardar resposta de terceiro aqui só serviria para servir
     dado velho de sincronização. */
  var u;
  try{ u = new URL(req.url); }catch(err){ return; }
  if(u.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copia); }).catch(function(){});
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        if(hit) return hit;
        /* Navegação sem rede e sem a URL exata no cache (por exemplo, aberta
           com ?algo): devolve o HTML guardado em vez de erro. */
        if(req.mode === 'navigate') return caches.match('./index.html') || caches.match('./');
        return Response.error();
      });
    })
  );
});
