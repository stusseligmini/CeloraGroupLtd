/**
 * Service Worker Template for Workbox
 * 
 * Production-ready service worker with Workbox precaching and runtime caching
 */

// Import Workbox libraries
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

// Check if Workbox loaded successfully
if (workbox) {
  console.log('[SW] Workbox loaded successfully');
  
  // Configure Workbox
  workbox.setConfig({
    debug: false, // Set to true for debugging
  });
  
  // Precache and route (will be populated by workbox-cli)
  workbox.precaching.precacheAndRoute([{"revision":"6c997cc50aab7140c1fd94f1aa354b8f","url":"server/app/_not-found/page_client-reference-manifest.js"},{"revision":"bdc6b53b91fa90b09b3fd875643d5e4e","url":"server/app/_not-found/page.js"},{"revision":"7f2a0b66ccacd0f213ad1c34b47b10de","url":"server/app/(auth)/reset-password/page_client-reference-manifest.js"},{"revision":"bf14f43a48af93d30ff4acf8a4fdf68e","url":"server/app/(auth)/reset-password/page.js"},{"revision":"1bc1d4c81d2d365bdd6a46e452593d3b","url":"server/app/(auth)/signin/page_client-reference-manifest.js"},{"revision":"0245aeb80d02eae0edc57e31fa3f241d","url":"server/app/(auth)/signin/page.js"},{"revision":"895c56fac5be759793286a54077f3bec","url":"server/app/(auth)/signup/page_client-reference-manifest.js"},{"revision":"9b29fcc8f2e1945bcba6aa021d0315c2","url":"server/app/(auth)/signup/page.js"},{"revision":"10dfca06103ed0029e155f4c649a05da","url":"server/app/(auth)/update-password/page_client-reference-manifest.js"},{"revision":"dcb9861e7f389958997b4928a5d68be1","url":"server/app/(auth)/update-password/page.js"},{"revision":"76c1bbc6a2d999f81ded9ac6d5ed83f4","url":"server/app/api/auth/b2c/session/route_client-reference-manifest.js"},{"revision":"abfb1fda5454ef04f4e3c46df2b116c8","url":"server/app/api/auth/b2c/session/route.js"},{"revision":"0f4d979ff4d19a4eea78e7a9cba121f4","url":"server/app/api/cards/[id]/controls/route_client-reference-manifest.js"},{"revision":"847908b0ec379e7868834fbc76ce3edc","url":"server/app/api/cards/[id]/controls/route.js"},{"revision":"ad59300083285f43828fae312c58a8b9","url":"server/app/api/cards/[id]/route_client-reference-manifest.js"},{"revision":"bb516439aa36cd800f7dcf159ea4d6c3","url":"server/app/api/cards/[id]/route.js"},{"revision":"addecb72a96bebf51f40674f4a989fae","url":"server/app/api/cards/authorize/route_client-reference-manifest.js"},{"revision":"931d33d3e883fab08c4cc0d3e0c5a701","url":"server/app/api/cards/authorize/route.js"},{"revision":"bebe2409a594f1ad7682d292677a95fa","url":"server/app/api/cards/insights/route_client-reference-manifest.js"},{"revision":"9fb7fcc51ed40bc9dfdb8d89f957ab77","url":"server/app/api/cards/insights/route.js"},{"revision":"c3b5c13829c66c64be3bf024fc905061","url":"server/app/api/cards/route_client-reference-manifest.js"},{"revision":"9569a2a391311cf58fc87699199da3db","url":"server/app/api/cards/route.js"},{"revision":"063383750f396a1a5c25676b6b69e6d3","url":"server/app/api/cards/subscriptions/route_client-reference-manifest.js"},{"revision":"178268a9e66eab57a37aea98e7872628","url":"server/app/api/cards/subscriptions/route.js"},{"revision":"d1a38113e15bb550b88b4827f285ed49","url":"server/app/api/diagnostics/env/route_client-reference-manifest.js"},{"revision":"5b9f0bf03658b3bf464441f3e1cffb56","url":"server/app/api/diagnostics/env/route.js"},{"revision":"5d5dc6d04ac846ffeed812060049b987","url":"server/app/api/diagnostics/health/route_client-reference-manifest.js"},{"revision":"475e98573e14e979b7c6395d6ff04d59","url":"server/app/api/diagnostics/health/route.js"},{"revision":"acfa125f5cdccc979b6c79c9bb5f3d38","url":"server/app/api/notifications/route_client-reference-manifest.js"},{"revision":"bbdc8c4289fadb3b165a341281891ba2","url":"server/app/api/notifications/route.js"},{"revision":"1f1c67acf479629a8f8cfb143e91a1be","url":"server/app/api/wallet/summary/route_client-reference-manifest.js"},{"revision":"9c6ff8593b6ed7d0e051862ec3ff7f95","url":"server/app/api/wallet/summary/route.js"},{"revision":"d6155ba2dc87fe67f4e5e8db741ba693","url":"server/app/api/wallet/vault/route_client-reference-manifest.js"},{"revision":"211257c48e0338c2f0ac0a986f2c1df6","url":"server/app/api/wallet/vault/route.js"},{"revision":"9f7425fb4ad5eb73de90660a5f45a3d8","url":"server/app/offline/page_client-reference-manifest.js"},{"revision":"b62e19cf4cc67e1922b3aa7ddeb51c1f","url":"server/app/offline/page.js"},{"revision":"a831c88185d9c7d0be657ddc579ac8e6","url":"server/app/page_client-reference-manifest.js"},{"revision":"189c254355ac97d86539d0a4aa889de5","url":"server/app/page.js"},{"revision":"8275646c2fdabb26e2f498e813c15645","url":"server/chunks/2146.js"},{"revision":"d39669db94561d3b0c0f90a16b8fcaef","url":"server/chunks/6321.js"},{"revision":"4c9d9788a1587c05e4d9581c4015438b","url":"server/chunks/6582.js"},{"revision":"d8bba6e3ecd4123ac9b447fd3d8eee47","url":"server/chunks/9322.js"},{"revision":"ff3a77407a42308c4f6f59a2bc43566c","url":"server/chunks/vendors-01d83bcb.js"},{"revision":"c93394d0437be083e26d334a278ab3f6","url":"server/chunks/vendors-03c9f57b.js"},{"revision":"c33d0d5cae1cf0e2f1e7e5dacce171dd","url":"server/chunks/vendors-0d360db4.js"},{"revision":"8a784f0a4967c35ce545352c38ffc710","url":"server/chunks/vendors-0fbe0e3f.js"},{"revision":"5cb8967ddb3674e361a3f212e831b118","url":"server/chunks/vendors-26c0a0b0.js"},{"revision":"b0dcec74d282eeae39da9452793722cf","url":"server/chunks/vendors-27f02048.js"},{"revision":"9ee4892f90729125f353606a70369d5c","url":"server/chunks/vendors-2898f16f.js"},{"revision":"d05ff7b066df24bd94cf30277db5b303","url":"server/chunks/vendors-2dcf9e52.js"},{"revision":"ae82de04df46ecaa928ee78d2a74e022","url":"server/chunks/vendors-2e4945ed.js"},{"revision":"8edc1dfe12980bbeed2e5c2f1041284b","url":"server/chunks/vendors-2fcefe7c.js"},{"revision":"b5207a28fc659feec5df62259c56c514","url":"server/chunks/vendors-362d063c.js"},{"revision":"76475134dd081628d2f84a44f70234f3","url":"server/chunks/vendors-377fed06.js"},{"revision":"60384fd2a731f6f0f1c8ce977e7531b2","url":"server/chunks/vendors-37a93c5f.js"},{"revision":"f485945d1926556b234b2d47f565be04","url":"server/chunks/vendors-4a7382ad.js"},{"revision":"7d03cd25dd608b69e7a98b56d4688c73","url":"server/chunks/vendors-4c7823de.js"},{"revision":"6e29b0fa0746f9f57f11789b297d2e07","url":"server/chunks/vendors-4e061213.js"},{"revision":"7f53389542682b1c1cd613e9f8fde822","url":"server/chunks/vendors-50bd0987.js"},{"revision":"3fa02ad9b1e0ab6fb47b631e93c4f0f4","url":"server/chunks/vendors-52607e5e.js"},{"revision":"345ea493b9df0dbfaa2968d7ab9571c1","url":"server/chunks/vendors-671cddd5.js"},{"revision":"8b9d7b0342a3c782f55d1fc62d8d2c29","url":"server/chunks/vendors-76fdc049.js"},{"revision":"34f0d825eaec2bcde33986894cc63c88","url":"server/chunks/vendors-78736aca.js"},{"revision":"e376736d0bc25e856bf81bbe9aa7de81","url":"server/chunks/vendors-7bea4d72.js"},{"revision":"fe4734db0a9e8ce5e3bf1580f038d0f0","url":"server/chunks/vendors-7f6e4960.js"},{"revision":"ac549e526f4ac49a475f6a392b69cb62","url":"server/chunks/vendors-80b0d5f0.js"},{"revision":"7843bb9c1a1419417183754c3702b7a8","url":"server/chunks/vendors-844b150b.js"},{"revision":"da5c0c679088b9a1dc70af9b43069794","url":"server/chunks/vendors-85cb083c.js"},{"revision":"fbeb62603a34a481c26078ffd86d64e4","url":"server/chunks/vendors-94912bad.js"},{"revision":"f2f20e906b83690adb0591994c6a943a","url":"server/chunks/vendors-96b4b958.js"},{"revision":"2e9057180b510838aadee9ad26d01f43","url":"server/chunks/vendors-9c5de514.js"},{"revision":"6f85bb3ca1d734e528b266c235d91b5c","url":"server/chunks/vendors-a73c26c6.js"},{"revision":"3e30cd146a479edd951dd5a1391f4068","url":"server/chunks/vendors-ac2f7d71.js"},{"revision":"3c19820e7c169d0c9a8b51b69130fc3e","url":"server/chunks/vendors-b4339950.js"},{"revision":"8eeaccac88836e91678a63a4aa356b32","url":"server/chunks/vendors-b6075d4d.js"},{"revision":"1099434df1a46a8f5331e03dfc8a23b1","url":"server/chunks/vendors-b9f70e77.js"},{"revision":"82d4bb1fd43927e4faec0e19032c978d","url":"server/chunks/vendors-b9fa02b6.js"},{"revision":"1eafb77047caba9e156023485e5ffc59","url":"server/chunks/vendors-bc050c32.js"},{"revision":"78175886b241f2922ad726f3eccb37ee","url":"server/chunks/vendors-bf6e8d65.js"},{"revision":"d7fe509b134ad48e2fe737f5544f2ee5","url":"server/chunks/vendors-c0d76f48.js"},{"revision":"6d68e7fe2e0a87e3e502108664a42bd0","url":"server/chunks/vendors-c5c6856a.js"},{"revision":"936277b54fd3f4eb47489542f0fd43d0","url":"server/chunks/vendors-d1ca98fd.js"},{"revision":"5bb70fcdf22c19eda5284e34a36293ab","url":"server/chunks/vendors-d843fcb9.js"},{"revision":"86c0594484ae4bc5d018b19925526e57","url":"server/chunks/vendors-dcf08135.js"},{"revision":"60a74a0da89a217e3c6e4a8b507f9417","url":"server/chunks/vendors-dfc0d3ba.js"},{"revision":"26f03320e971cab2f9dc1346ee2b9548","url":"server/chunks/vendors-e1a80850.js"},{"revision":"e1cb1dbddc906d38aaa863893da6f6e1","url":"server/chunks/vendors-e7cfeb3d.js"},{"revision":"4f35f900c1953c80bbd37955b461eece","url":"server/chunks/vendors-e83bbcea.js"},{"revision":"fa2f21341eda074e8195649423dfc647","url":"server/chunks/vendors-fedc906c.js"},{"revision":"759e388287dea886ba3e182759a5aec0","url":"server/edge-runtime-webpack.js"},{"revision":"d7aa1834e4b5ee75408143d266ce2f1c","url":"server/interception-route-rewrite-manifest.js"},{"revision":"e507ae873403276517f33fcf1dcd41b4","url":"server/middleware-build-manifest.js"},{"revision":"5f57d06dc1fd5377667380d3d89372d5","url":"server/middleware-react-loadable-manifest.js"},{"revision":"9fce7989bff5d35b01e177447faca50d","url":"server/next-font-manifest.js"},{"revision":"41cdcd3b14188f140e79d27705761955","url":"server/pages/_app.js"},{"revision":"2e9e47ec3193e236eec959f194cede88","url":"server/pages/_document.js"},{"revision":"849e1f5a70e9a36447e9e3b1ae366e85","url":"server/pages/_error.js"},{"revision":"cf2b3a7428400c3302bb0b3760eae70c","url":"server/pages/500.html"},{"revision":"d90c32b1f9878714c8d3607960b5cba0","url":"server/server-reference-manifest.js"},{"revision":"029c0504834c9298eaf24c8811d9cb7e","url":"server/src/middleware.js"},{"revision":"3ff0a56657a44c6e8994cba85368324d","url":"server/webpack-runtime.js"},{"revision":"471274d208e7da8d4af2c278eb1feb74","url":"static/chunks/1547-d24e789ed1d65e8a.js"},{"revision":"2a9c2166a0ae63c27a466c7fb5903d80","url":"static/chunks/4bd1b696-100b9d70ed4e49c1.js"},{"revision":"754520dba26c1aa7f907a47385a71ce6","url":"static/chunks/app/_not-found/page-89355abbffaf1755.js"},{"revision":"dfc246ac9503167815d833070227c1f7","url":"static/chunks/app/(auth)/reset-password/page-cf1398c3383835da.js"},{"revision":"8cd6e2370f395b0ea81b0a2d0efd8cef","url":"static/chunks/app/(auth)/signin/page-4cb551d9c1f62010.js"},{"revision":"42fb5517d896d220cfa38ee52000bfaa","url":"static/chunks/app/(auth)/signup/page-d722900b7222a369.js"},{"revision":"5e4789da8d0eac3077de709e1d0924df","url":"static/chunks/app/(auth)/update-password/page-38877f96c7b32bff.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/auth/b2c/session/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/cards/[id]/controls/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/cards/[id]/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/cards/authorize/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/cards/insights/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/cards/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/cards/subscriptions/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/diagnostics/env/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/diagnostics/health/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/notifications/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/wallet/summary/route-764233e18b7b250d.js"},{"revision":"b2b24d1f787518f7d13e670543f8de20","url":"static/chunks/app/api/wallet/vault/route-764233e18b7b250d.js"},{"revision":"985ef12d3fd33cb7c7ae7f696e64c266","url":"static/chunks/app/layout-62d9e3e12b5476de.js"},{"revision":"d4226fc8f8dfcef400884189469b93ac","url":"static/chunks/app/offline/page-7044f4923bb9949c.js"},{"revision":"76621d966d60a2f99a0b3c65df75ee1c","url":"static/chunks/app/page-1337acea216a4ee0.js"},{"revision":"96f50758cda30439944f13d28448b7c4","url":"static/chunks/framework-0907bc41f77e1d3c.js"},{"revision":"b53c1248209c8a59630aa571ce45a390","url":"static/chunks/main-97f291a76cc95bdf.js"},{"revision":"083806f0fc502e52ffab544bfa155374","url":"static/chunks/main-app-3ea1a43cbf98012d.js"},{"revision":"ea26488b2e126707bbd525d1fd1b0d2c","url":"static/chunks/pages/_app-4e4b7bfc0e05d826.js"},{"revision":"ce4a47a2afc0836513b5843123e2e766","url":"static/chunks/pages/_error-17deef4da7f82428.js"},{"revision":"846118c33b2c0e922d7b3a7676f81f6f","url":"static/chunks/polyfills-42372ed130431b0a.js"},{"revision":"550f321587a7fc04f83cde1f10e59949","url":"static/chunks/vendors-07c28d65-5e51abf6f8168e8a.js"},{"revision":"45f28cb85ce8e8c07c68cab1a6f49c9f","url":"static/chunks/vendors-0d360db4-a51f802c18aad054.js"},{"revision":"68585ea3a7cd48f251bc289d536bc5b5","url":"static/chunks/vendors-1fcf5b5d-a09aa073213d982c.js"},{"revision":"e7d58f3d7238facfff88993470cd68a0","url":"static/chunks/vendors-255715a5-358a2a5c05ae62ef.js"},{"revision":"12f3e1ce8cb72769f6216196f2fb8962","url":"static/chunks/vendors-27f02048-f9a4c2e00234da1b.js"},{"revision":"088c5c405737ffbd46274b1f208032d2","url":"static/chunks/vendors-2dc33e19-0e38e04e72610f0c.js"},{"revision":"2fd9c552c66e8d3ec646b05b5c84567e","url":"static/chunks/vendors-2dcf9e52-157b04c76741847b.js"},{"revision":"f082f6214460d2379fb31e5738a4c7d8","url":"static/chunks/vendors-2e4945ed-d5de0c79d8c834e7.js"},{"revision":"a93b10cd983c2b7ab68fd48484886d6a","url":"static/chunks/vendors-362d063c-566b22b92b806059.js"},{"revision":"6577645b527701e392fe922013d2caca","url":"static/chunks/vendors-4497f2ad-804da9a20012ed07.js"},{"revision":"6ca45b43f61c53f98213f5cc02ad3d28","url":"static/chunks/vendors-4a7382ad-d97e4353e4d9e15f.js"},{"revision":"c96a510ae904c15e386239833ea7ed8a","url":"static/chunks/vendors-4aa88247-a2a159990b46bd07.js"},{"revision":"87187d15cf553047eb374b1f9146ffb9","url":"static/chunks/vendors-4c7823de-4eba504bec3228be.js"},{"revision":"62f7cac9fac187ee663a3ee19eb4ff7e","url":"static/chunks/vendors-50bd0987-6acc656b469fcb8d.js"},{"revision":"16d20b6ea71e6031c1f77d279da0b3d7","url":"static/chunks/vendors-5262d9fa-dd4cbd38c2acdaef.js"},{"revision":"aa2929648f9f3bf087f4161458227287","url":"static/chunks/vendors-730ce95c-aa024b5e4004f380.js"},{"revision":"0c32593ceadf43c2fd202339ebe19370","url":"static/chunks/vendors-76fdc049-06a4793a3b655620.js"},{"revision":"cc29e632145541779eaaeb940ea7ecb0","url":"static/chunks/vendors-7bea4d72-2500681fd74a203f.js"},{"revision":"0cf8a43133e6215761f379bde9793566","url":"static/chunks/vendors-89d5c698-6f15d54ec48043c2.js"},{"revision":"cf335063178e8ae9bc66f8db05b2d30b","url":"static/chunks/vendors-94912bad-e143bba39cab722f.js"},{"revision":"165adf2751698cf052798279ac090c96","url":"static/chunks/vendors-98a6762f-f04a270c2d748c01.js"},{"revision":"d586fe0d04a1ff561b4facd0fc97c638","url":"static/chunks/vendors-a6f90180-cf06957013524038.js"},{"revision":"8e4f51018b2d0b5c85e8f3cd86cf0a8b","url":"static/chunks/vendors-b4339950-82351690b421adce.js"},{"revision":"e2f15ecd19b163c87702225577c6b5ba","url":"static/chunks/vendors-b752a131-14064b714c7c32ef.js"},{"revision":"6330caccc7793cec33fbe91f40137615","url":"static/chunks/vendors-bc77ec33-6a1134ba4b6763dd.js"},{"revision":"bc67d84f6cb0100ef6023f5c1ed06f76","url":"static/chunks/vendors-d1ca98fd-b15c1884cdc6af25.js"},{"revision":"d26aa2ff029a89e53192b771976b2a00","url":"static/chunks/vendors-d91c2bd6-69dabeb2c794575b.js"},{"revision":"75d46534c8ef52e3efea6ffa27a2f249","url":"static/chunks/vendors-d929e15b-648ac3ebbb30fa92.js"},{"revision":"cbb2f67b1bfa336c6410059ab954b859","url":"static/chunks/vendors-dc1e38f8-a43ae8a3dcc5bac2.js"},{"revision":"55602f96607d4b3633ca3d74978bef0a","url":"static/chunks/vendors-dfc0d3ba-7e708730e3086415.js"},{"revision":"5f3aa58ac8e657804ff7019124226370","url":"static/chunks/vendors-e1a80850-845870f56d0085ab.js"},{"revision":"bf07ab7c5e655f67b8628dc14d0cb25f","url":"static/chunks/vendors-f945abb9-5c6b1fde5ec9b8ff.js"},{"revision":"ab3bccd31ed22068c3afc2ca8b0fac93","url":"static/chunks/vendors-fedc906c-0e7c1748fde5d762.js"},{"revision":"5e285081c53552631a66df17c70a2fce","url":"static/chunks/webpack-b8e1e74fcc0052ca.js"},{"revision":"8b41049d75f10b0ffc19a42216c2d3ed","url":"static/css/a228cb2b7c20d34e.css"},{"revision":"5286fefa379746906a850810b2a4a038","url":"static/WlQjStBkhRoW4srOoABRo/_buildManifest.js"},{"revision":"b404e23d62d95bafd03ad7747cc0e88b","url":"static/WlQjStBkhRoW4srOoABRo/_ssgManifest.js"}] || []);
  
  // Clean up old precaches
  workbox.precaching.cleanupOutdatedCaches();
  
  // =====================================================================
  // Runtime Caching Strategies
  // =====================================================================
  
  // Cache API responses with NetworkFirst strategy
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'celora-api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
      networkTimeoutSeconds: 10,
    })
  );
  
  // Cache images with CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'celora-images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
  
  // Cache fonts with CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'celora-fonts-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    })
  );
  
  // Cache CSS/JS with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'style' || 
      request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'celora-static-resources',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );
  
  // Cache Google Fonts stylesheets with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
    })
  );
  
  // Cache Google Fonts webfonts with CacheFirst
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
  
  // Cache Azure B2C assets with NetworkFirst
  workbox.routing.registerRoute(
    ({ url }) => url.hostname.includes('b2clogin.com'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'azure-b2c-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  );
  
  // Cache Application Insights with NetworkFirst
  workbox.routing.registerRoute(
    ({ url }) => 
      url.hostname.includes('applicationinsights.azure.com') ||
      url.hostname.includes('monitor.azure.com'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'app-insights-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
    })
  );
  
  // =====================================================================
  // Offline Fallback
  // =====================================================================
  
  // Set up navigation fallback
  const FALLBACK_HTML_URL = '/offline';
  const FALLBACK_IMAGE_URL = '/images/offline-image.svg';
  
  // Catch navigation requests and serve offline page if network fails
  workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkFirst({
      cacheName: 'celora-pages-cache',
    })
  );
  
  // Offline fallback for navigation requests
  workbox.routing.setCatchHandler(async ({ request }) => {
    // Only handle navigation requests with offline page
    if (request.destination === 'document') {
      return caches.match(FALLBACK_HTML_URL) || Response.error();
    }
    
    // Fallback for images
    if (request.destination === 'image') {
      return caches.match(FALLBACK_IMAGE_URL) || Response.error();
    }
    
    return Response.error();
  });
  
  // =====================================================================
  // Background Sync
  // =====================================================================
  
  // Queue failed POST requests for background sync
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('celora-queue', {
    maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  });
  
  // Register background sync for API POST requests
  workbox.routing.registerRoute(
    ({ url, request }) => 
      url.pathname.startsWith('/api/') && 
      (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH'),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );
  
  // =====================================================================
  // Message Handling
  // =====================================================================
  
  // Listen for skip waiting message
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
  
  // Notify clients when cache is updated
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      clients.claim().then(() => {
        return clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'CACHE_UPDATED',
              version: '1.0.0',
            });
          });
        });
      })
    );
  });
  
  // Notify clients when offline mode is ready
  self.addEventListener('install', (event) => {
    event.waitUntil(
      self.skipWaiting().then(() => {
        return clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'OFFLINE_READY',
            });
          });
        });
      })
    );
  });
  
  // =====================================================================
  // Update Check
  // =====================================================================
  
  // Check for updates every hour
  setInterval(() => {
    self.registration.update();
  }, 60 * 60 * 1000);
  
  console.log('[SW] Service Worker initialized with Workbox');
  
} else {
  console.error('[SW] Workbox failed to load');
}
